import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertIdempotent,
  createEffectRecorder,
  defineScenario,
  effectClientFromRequest,
  RehearsalAssertionError,
  runHttpScenario,
  runScenario,
  type Scenario,
} from '../src/index.js';

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

const duplicateScenario = defineScenario({
  name: 'invoice duplicate after retry',
  deliveries: [
    { eventId: 'evt_demo_01', idempotencyKey: 'invoice_demo_01', payload: { total: 2400 } },
    { eventId: 'evt_demo_01_retry', idempotencyKey: 'invoice_demo_01', payload: { total: 2400 }, afterMs: 1 },
  ],
  expect: [{ adapter: 'payment', action: 'capture', idempotencyKey: 'invoice_demo_01', count: 1 }],
});

describe('in-process rehearsal', () => {
  it('runs the documented example and proves a single effect', async () => {
    const recorder = createEffectRecorder();
    const claimed = new Set<string>();
    const report = await runScenario({
      scenario: duplicateScenario,
      recorder,
      handler: async (delivery, effects) => {
        if (claimed.has(delivery.idempotencyKey)) return;
        claimed.add(delivery.idempotencyKey);
        await effects.payment({
          action: 'capture',
          idempotencyKey: delivery.idempotencyKey,
          amount: delivery.payload.total,
          currency: 'USD',
        });
      },
    });

    expect(report.passed).toBe(true);
    expect(report.summary).toEqual({ deliveries: 2, effects: 1, violations: 0 });
    expect(() => assertIdempotent(report)).not.toThrow();
    expect(JSON.stringify(report)).not.toContain('2400');
  });

  it('reports a duplicate without leaking effect metadata', async () => {
    const report = await runScenario({
      scenario: duplicateScenario,
      handler: async (delivery, effects) => {
        await effects.payment({ action: 'capture', idempotencyKey: delivery.idempotencyKey, amount: 2400 });
      },
    });

    expect(report.passed).toBe(false);
    expect(report.violations[0]).toMatchObject({ kind: 'unexpected_count', expected: 1, actual: 2 });
    expect(() => assertIdempotent(report)).toThrow(RehearsalAssertionError);
    expect(JSON.stringify(report)).not.toContain('2400');
  });

  it('invokes adjacent deliveries in a parallel group concurrently', async () => {
    let active = 0;
    let maximum = 0;
    const scenario = defineScenario({
      name: 'concurrent duplicate',
      deliveries: [
        { eventId: 'evt_test_a', idempotencyKey: 'job_test_1', payload: {}, parallelGroup: 'race' },
        { eventId: 'evt_test_b', idempotencyKey: 'job_test_1', payload: {}, parallelGroup: 'race' },
      ],
    });
    const report = await runScenario({
      scenario,
      handler: async () => {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      },
    });
    expect(maximum).toBe(2);
    expect(report.passed).toBe(true);
  });

  it('turns handler errors into a secret-safe failed report', async () => {
    const scenario = defineScenario({
      name: 'handler error',
      deliveries: [{ eventId: 'evt_test_error', idempotencyKey: 'order_test_error', payload: { note: 'do-not-report' } }],
    });
    const report = await runScenario({ scenario, handler: () => { throw new Error('database unavailable'); } });
    expect(report.violations[0]).toMatchObject({ kind: 'delivery_error' });
    expect(JSON.stringify(report)).not.toContain('do-not-report');
  });
});

describe('validation', () => {
  it('rejects empty scenarios, live-looking IDs, and secret-bearing payload fields', () => {
    expect(() => defineScenario({ name: 'empty', deliveries: [] })).toThrow('at least one');
    expect(() => defineScenario({
      name: 'live',
      deliveries: [{ eventId: 'evt_live_123', idempotencyKey: 'order_demo', payload: {} }],
    })).toThrow('live identifier');
    expect(() => defineScenario({
      name: 'secret',
      deliveries: [{ eventId: 'evt_test', idempotencyKey: 'order_test', payload: { token: 'test-token' } }],
    })).toThrow('secret-bearing');
  });

  it('refuses a non-loopback effect collector', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-idempotency-rehearsal-effect-url': 'https://example.com/collect' },
    });
    expect(() => effectClientFromRequest(request)).toThrow('loopback');
  });
});

describe('HTTP rehearsal', () => {
  it('sends headers, collects inert effects, and detects duplicate behavior', async () => {
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { orderId: string };
      const webRequest = new Request('http://localhost/webhook', { headers: new Headers(request.headers as Record<string, string>) });
      const effects = effectClientFromRequest(webRequest);
      await effects.email({ action: 'send-receipt', idempotencyKey: payload.orderId, template: 'receipt' });
      response.writeHead(204).end();
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('server did not bind');
    const scenario: Scenario = {
      name: 'HTTP duplicate',
      deliveries: [
        { eventId: 'evt_demo_a', idempotencyKey: 'order_demo_1', payload: { orderId: 'order_demo_1' } },
        { eventId: 'evt_demo_b', idempotencyKey: 'order_demo_1', payload: { orderId: 'order_demo_1' } },
      ],
    };
    const report = await runHttpScenario({ scenario, url: `http://127.0.0.1:${address.port}/webhook` });
    expect(report.passed).toBe(false);
    expect(report.summary.effects).toBe(2);
    expect(report.violations[0]).toMatchObject({ kind: 'duplicate_effect', actual: 2 });
  });
});
