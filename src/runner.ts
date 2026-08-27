import { createEffectRecorder } from './recorder.js';
import { makeReport } from './report.js';
import type {
  Delivery,
  DeliveryResult,
  EffectRecorder,
  JsonObject,
  RehearsalHandler,
  RehearsalReport,
  Scenario,
} from './types.js';
import { validateScenario } from './validation.js';

const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));
const HANDLER_FAILURE = 'Handler failed.';

function deliveryGroups<TPayload extends JsonObject>(deliveries: Delivery<TPayload>[]): Delivery<TPayload>[][] {
  const groups: Delivery<TPayload>[][] = [];
  for (const delivery of deliveries) {
    const previous = groups.at(-1);
    if (delivery.parallelGroup && previous?.[0]?.parallelGroup === delivery.parallelGroup) previous.push(delivery);
    else groups.push([delivery]);
  }
  return groups;
}

export async function runScenario<TPayload extends JsonObject>(options: {
  scenario: Scenario<TPayload>;
  handler: RehearsalHandler<TPayload>;
  recorder?: EffectRecorder;
}): Promise<RehearsalReport> {
  const scenario = validateScenario(options.scenario);
  const recorder = options.recorder ?? createEffectRecorder();
  const startedAt = new Date();
  const results: DeliveryResult[] = [];
  let index = 0;

  for (const group of deliveryGroups(scenario.deliveries)) {
    const delay = Math.max(...group.map((delivery) => delivery.afterMs ?? 0));
    if (delay > 0) await wait(delay);
    const groupStart = index;
    await Promise.all(group.map(async (delivery, groupIndex) => {
      const currentIndex = groupStart + groupIndex;
      const started = performance.now();
      try {
        await options.handler(Object.freeze({ ...delivery }), recorder);
        results[currentIndex] = {
          eventId: delivery.eventId,
          idempotencyKey: delivery.idempotencyKey,
          index: currentIndex,
          status: 'accepted',
          durationMs: Math.round((performance.now() - started) * 100) / 100,
        };
      } catch {
        results[currentIndex] = {
          eventId: delivery.eventId,
          idempotencyKey: delivery.idempotencyKey,
          index: currentIndex,
          status: 'error',
          durationMs: Math.round((performance.now() - started) * 100) / 100,
          // Handler errors are untrusted: they may include payload values from a
          // validator, dependency, or hand-written error message. Keep reports
          // and CI serialization limited to this stable failure category.
          error: HANDLER_FAILURE,
        };
      }
    }));
    index += group.length;
  }

  return makeReport({
    scenario: scenario.name,
    startedAt,
    deliveries: results,
    effects: recorder.effects,
    ...(scenario.expect ? { expect: scenario.expect } : {}),
  });
}

export function defineScenario<TPayload extends JsonObject>(scenario: Scenario<TPayload>): Scenario<TPayload> {
  return validateScenario(scenario);
}
