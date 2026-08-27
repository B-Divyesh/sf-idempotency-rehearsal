import type { Delivery, JsonObject, JsonValue, Scenario } from './types.js';

const LIVE_ID = /(?:^|[_-])(live|prod|production)(?:[_-]|$)|^(?:sk|pk|rk)_live_|^whsec_/i;
const SYNTHETIC_ID = /(?:^|[_-])(test|demo|fixture|example|fake|sandbox|rehearsal|local)(?:[_-]|$)/i;
const SENSITIVE_FIELD = /^(authorization|cookie|password|secret|signature|token|api[_-]?key)$/i;

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function scanPayload(value: JsonValue, path = 'payload'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPayload(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_FIELD.test(key)) {
        throw new TypeError(`${path}.${key} looks secret-bearing; rehearsal payloads must use synthetic, non-secret fields.`);
      }
      scanPayload(child, `${path}.${key}`);
    }
  }
}

function validateDelivery(delivery: Delivery, index: number): void {
  assertString(delivery.eventId, `deliveries[${index}].eventId`);
  assertString(delivery.idempotencyKey, `deliveries[${index}].idempotencyKey`);
  if (LIVE_ID.test(delivery.eventId) || LIVE_ID.test(delivery.idempotencyKey)) {
    throw new TypeError(`deliveries[${index}] looks like a live identifier; use a synthetic test identifier.`);
  }
  if (!SYNTHETIC_ID.test(delivery.eventId) || !SYNTHETIC_ID.test(delivery.idempotencyKey)) {
    throw new TypeError(`deliveries[${index}] identifiers must include a synthetic marker such as test, demo, fixture, or sandbox.`);
  }
  if (!delivery.payload || typeof delivery.payload !== 'object' || Array.isArray(delivery.payload)) {
    throw new TypeError(`deliveries[${index}].payload must be a JSON object.`);
  }
  if (delivery.afterMs !== undefined && (!Number.isFinite(delivery.afterMs) || delivery.afterMs < 0 || delivery.afterMs > 60_000)) {
    throw new TypeError(`deliveries[${index}].afterMs must be between 0 and 60000.`);
  }
  if (delivery.parallelGroup !== undefined) assertString(delivery.parallelGroup, `deliveries[${index}].parallelGroup`);
  scanPayload(delivery.payload);
}

export function validateScenario<TPayload extends JsonObject>(input: Scenario<TPayload>): Scenario<TPayload> {
  if (!input || typeof input !== 'object') throw new TypeError('Scenario must be an object.');
  assertString(input.name, 'scenario.name');
  if (!Array.isArray(input.deliveries) || input.deliveries.length === 0) {
    throw new TypeError('scenario.deliveries must contain at least one delivery.');
  }
  input.deliveries.forEach((delivery, index) => validateDelivery(delivery, index));
  input.expect?.forEach((expectation, index) => {
    assertString(expectation.adapter, `expect[${index}].adapter`);
    assertString(expectation.action, `expect[${index}].action`);
    assertString(expectation.idempotencyKey, `expect[${index}].idempotencyKey`);
    if (expectation.count !== undefined && (!Number.isInteger(expectation.count) || expectation.count < 0)) {
      throw new TypeError(`expect[${index}].count must be a non-negative integer.`);
    }
  });
  return input;
}
