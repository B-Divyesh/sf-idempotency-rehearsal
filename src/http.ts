import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createEffectRecorder } from './recorder.js';
import { makeReport } from './report.js';
import type {
  CustomEffect,
  Delivery,
  DeliveryResult,
  EffectGateway,
  EffectRecorder,
  EmailEffect,
  JsonObject,
  PaymentEffect,
  RehearsalReport,
  Scenario,
} from './types.js';
import { validateScenario } from './validation.js';

const COLLECTOR_HEADER = 'x-idempotency-rehearsal-effect-url';
const MAX_EFFECT_BODY_BYTES = 16_384;
const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));

function isLoopback(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]';
}

function assertLoopbackUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError('The rehearsal effect collector URL is invalid.');
  }
  if (url.protocol !== 'http:' || !isLoopback(url.hostname)) {
    throw new TypeError('The rehearsal effect collector must use HTTP on a loopback host.');
  }
  return url;
}

async function startCollector(recorder: EffectRecorder): Promise<{ url: string; close: () => Promise<void> }> {
  const token = randomBytes(18).toString('base64url');
  const server: Server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== `/effects/${token}`) {
      response.writeHead(404).end();
      return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_EFFECT_BODY_BYTES) chunks.push(chunk);
    });
    request.on('end', async () => {
      if (size > MAX_EFFECT_BODY_BYTES) {
        response.writeHead(413).end();
        return;
      }
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as CustomEffect;
        await recorder.record(value);
        response.writeHead(204).end();
      } catch {
        response.writeHead(400).end();
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not bind the effect collector.');
  return {
    url: `http://127.0.0.1:${address.port}/effects/${token}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function groups<TPayload extends JsonObject>(deliveries: Delivery<TPayload>[]): Delivery<TPayload>[][] {
  const output: Delivery<TPayload>[][] = [];
  for (const delivery of deliveries) {
    const last = output.at(-1);
    if (delivery.parallelGroup && last?.[0]?.parallelGroup === delivery.parallelGroup) last.push(delivery);
    else output.push([delivery]);
  }
  return output;
}

export async function runHttpScenario<TPayload extends JsonObject>(options: {
  scenario: Scenario<TPayload>;
  url: string | URL;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetch?: typeof fetch;
}): Promise<RehearsalReport> {
  const scenario = validateScenario(options.scenario);
  const target = new URL(options.url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new TypeError('Target URL must use HTTP or HTTPS.');
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new TypeError('timeoutMs must be between 1 and 120000.');
  }
  const request = options.fetch ?? globalThis.fetch;
  if (!request) throw new Error('A Fetch API implementation is required.');
  const recorder = createEffectRecorder();
  const collector = await startCollector(recorder);
  const startedAt = new Date();
  const results: DeliveryResult[] = [];
  let index = 0;

  try {
    for (const group of groups(scenario.deliveries)) {
      const delay = Math.max(...group.map((delivery) => delivery.afterMs ?? 0));
      if (delay > 0) await wait(delay);
      const groupStart = index;
      await Promise.all(group.map(async (delivery, groupIndex) => {
        const currentIndex = groupStart + groupIndex;
        const started = performance.now();
        try {
          const response = await request(target, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'user-agent': 'idempotency-rehearsal/0.1',
              'x-idempotency-key': delivery.idempotencyKey,
              'x-rehearsal-event-id': delivery.eventId,
              [COLLECTOR_HEADER]: collector.url,
              ...options.headers,
            },
            body: JSON.stringify(delivery.payload),
            signal: AbortSignal.timeout(timeoutMs),
          });
          const accepted = response.ok;
          results[currentIndex] = {
            eventId: delivery.eventId,
            idempotencyKey: delivery.idempotencyKey,
            index: currentIndex,
            status: accepted ? 'accepted' : 'error',
            httpStatus: response.status,
            durationMs: Math.round((performance.now() - started) * 100) / 100,
            ...(accepted ? {} : { error: `HTTP ${response.status}` }),
          };
        } catch (error) {
          results[currentIndex] = {
            eventId: delivery.eventId,
            idempotencyKey: delivery.idempotencyKey,
            index: currentIndex,
            status: 'error',
            durationMs: Math.round((performance.now() - started) * 100) / 100,
            error: error instanceof Error ? error.message : 'Request failed',
          };
        }
      }));
      index += group.length;
    }
    await wait(10);
  } finally {
    await collector.close();
  }

  return makeReport({
    scenario: scenario.name,
    startedAt,
    deliveries: results,
    effects: recorder.effects,
    ...(scenario.expect ? { expect: scenario.expect } : {}),
  });
}

function collectorUrlFromRequest(request: Request | { headers: { get(name: string): string | null } }): URL {
  const value = request.headers.get(COLLECTOR_HEADER);
  if (!value) throw new Error(`Missing ${COLLECTOR_HEADER} header; this adapter only works during a rehearsal.`);
  return assertLoopbackUrl(value);
}

export function effectClientFromRequest(request: Request | { headers: { get(name: string): string | null } }): EffectGateway {
  const collector = collectorUrlFromRequest(request);
  const record = async (effect: CustomEffect): Promise<void> => {
    const response = await fetch(collector, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        adapter: effect.adapter,
        action: effect.action,
        idempotencyKey: effect.idempotencyKey,
      }),
    });
    if (!response.ok) throw new Error(`Effect collector rejected ${effect.adapter}.${effect.action} (${response.status}).`);
  };
  return {
    payment(effect: PaymentEffect) {
      return record({ adapter: 'payment', action: effect.action, idempotencyKey: effect.idempotencyKey });
    },
    email(effect: EmailEffect) {
      return record({ adapter: 'email', action: effect.action, idempotencyKey: effect.idempotencyKey });
    },
    record,
  };
}
