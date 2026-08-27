import type {
  CustomEffect,
  EffectRecorder,
  EmailEffect,
  PaymentEffect,
  RecordedEffect,
} from './types.js';

function validateEffect(adapter: string, action: string, idempotencyKey: string): void {
  if (!adapter.trim() || !action.trim() || !idempotencyKey.trim()) {
    throw new TypeError('Effects require non-empty adapter, action, and idempotencyKey values.');
  }
}

export function createEffectRecorder(): EffectRecorder {
  const recorded: RecordedEffect[] = [];
  const record = async ({ adapter, action, idempotencyKey }: CustomEffect): Promise<void> => {
    validateEffect(adapter, action, idempotencyKey);
    recorded.push({
      adapter,
      action,
      idempotencyKey,
      sequence: recorded.length + 1,
      recordedAtMs: Date.now(),
    });
  };

  return {
    get effects() {
      return recorded;
    },
    payment(effect: PaymentEffect) {
      return record({ adapter: 'payment', action: effect.action, idempotencyKey: effect.idempotencyKey });
    },
    email(effect: EmailEffect) {
      return record({ adapter: 'email', action: effect.action, idempotencyKey: effect.idempotencyKey });
    },
    record,
    clear() {
      recorded.length = 0;
    },
  };
}
