export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface Delivery<TPayload extends JsonObject = JsonObject> {
  eventId: string;
  idempotencyKey: string;
  payload: TPayload;
  /** Delay relative to the previous delivery group. */
  afterMs?: number;
  /** Adjacent deliveries with the same group are invoked concurrently. */
  parallelGroup?: string;
}

export interface EffectExpectation {
  adapter: string;
  action: string;
  idempotencyKey: string;
  count?: number;
}

export interface Scenario<TPayload extends JsonObject = JsonObject> {
  name: string;
  deliveries: Delivery<TPayload>[];
  expect?: EffectExpectation[];
}

export interface PaymentEffect {
  action: string;
  idempotencyKey: string;
  amount?: number;
  currency?: string;
}

export interface EmailEffect {
  action: string;
  idempotencyKey: string;
  template?: string;
}

export interface CustomEffect {
  adapter: string;
  action: string;
  idempotencyKey: string;
  metadata?: JsonObject;
}

export interface RecordedEffect {
  adapter: string;
  action: string;
  idempotencyKey: string;
  sequence: number;
  recordedAtMs: number;
}

export interface EffectGateway {
  payment(effect: PaymentEffect): Promise<void>;
  email(effect: EmailEffect): Promise<void>;
  record(effect: CustomEffect): Promise<void>;
}

export interface EffectRecorder extends EffectGateway {
  readonly effects: readonly RecordedEffect[];
  clear(): void;
}

export interface DeliveryResult {
  eventId: string;
  idempotencyKey: string;
  index: number;
  status: 'accepted' | 'error';
  durationMs: number;
  httpStatus?: number;
  error?: string;
}

export type ViolationKind = 'duplicate_effect' | 'unexpected_count' | 'delivery_error';

export interface Violation {
  kind: ViolationKind;
  message: string;
  adapter?: string;
  action?: string;
  idempotencyKey?: string;
  expected?: number;
  actual?: number;
}

export interface RehearsalReport {
  scenario: string;
  passed: boolean;
  startedAt: string;
  durationMs: number;
  deliveries: DeliveryResult[];
  effects: RecordedEffect[];
  violations: Violation[];
  summary: {
    deliveries: number;
    effects: number;
    violations: number;
  };
}

export type RehearsalHandler<TPayload extends JsonObject = JsonObject> = (
  delivery: Readonly<Delivery<TPayload>>,
  effects: EffectGateway,
) => void | Promise<void>;
