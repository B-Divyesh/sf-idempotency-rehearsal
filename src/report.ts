import type { DeliveryResult, EffectExpectation, RecordedEffect, RehearsalReport, Violation } from './types.js';

const effectKey = ({ adapter, action, idempotencyKey }: Pick<RecordedEffect, 'adapter' | 'action' | 'idempotencyKey'>) =>
  `${adapter}\u0000${action}\u0000${idempotencyKey}`;

export function makeReport(input: {
  scenario: string;
  startedAt: Date;
  deliveries: DeliveryResult[];
  effects: readonly RecordedEffect[];
  expect?: EffectExpectation[];
}): RehearsalReport {
  const violations: Violation[] = input.deliveries
    .filter((delivery) => delivery.status === 'error')
    .map((delivery) => ({
      kind: 'delivery_error',
      message: `Delivery ${delivery.eventId} failed: ${delivery.error ?? 'handler returned an error'}`,
      idempotencyKey: delivery.idempotencyKey,
    }));
  const counts = new Map<string, number>();
  for (const effect of input.effects) counts.set(effectKey(effect), (counts.get(effectKey(effect)) ?? 0) + 1);
  const expectedKeys = new Set<string>();

  for (const expectation of input.expect ?? []) {
    const key = effectKey(expectation);
    expectedKeys.add(key);
    const expected = expectation.count ?? 1;
    const actual = counts.get(key) ?? 0;
    if (actual !== expected) {
      violations.push({
        kind: 'unexpected_count',
        message: `${expectation.adapter}.${expectation.action} for ${expectation.idempotencyKey}: expected ${expected}, observed ${actual}.`,
        adapter: expectation.adapter,
        action: expectation.action,
        idempotencyKey: expectation.idempotencyKey,
        expected,
        actual,
      });
    }
  }

  for (const [key, actual] of counts) {
    if (actual <= 1 || expectedKeys.has(key)) continue;
    const [adapter, action, idempotencyKey] = key.split('\u0000') as [string, string, string];
    violations.push({
      kind: 'duplicate_effect',
      message: `${adapter}.${action} for ${idempotencyKey} ran ${actual} times.`,
      adapter,
      action,
      idempotencyKey,
      expected: 1,
      actual,
    });
  }

  const durationMs = Math.max(0, Date.now() - input.startedAt.getTime());
  return {
    scenario: input.scenario,
    passed: violations.length === 0,
    startedAt: input.startedAt.toISOString(),
    durationMs,
    deliveries: input.deliveries,
    effects: [...input.effects],
    violations,
    summary: {
      deliveries: input.deliveries.length,
      effects: input.effects.length,
      violations: violations.length,
    },
  };
}

export class RehearsalAssertionError extends Error {
  readonly report: RehearsalReport;

  constructor(report: RehearsalReport) {
    super(`Idempotency rehearsal “${report.scenario}” failed with ${report.violations.length} violation(s).`);
    this.name = 'RehearsalAssertionError';
    this.report = report;
  }
}

export function assertIdempotent(report: RehearsalReport): asserts report is RehearsalReport & { passed: true } {
  if (!report.passed) throw new RehearsalAssertionError(report);
}
