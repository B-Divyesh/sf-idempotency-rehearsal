/**
 * Browser-safe entry point for the local playground.
 *
 * It deliberately omits the Node-only HTTP collector. Import this entry in a
 * browser test page when a scenario has an in-process handler.
 */
export { createEffectRecorder } from './recorder.js';
export { defineScenario, runScenario } from './runner.js';
export { assertIdempotent, RehearsalAssertionError } from './report.js';
export type {
  CustomEffect,
  Delivery,
  DeliveryResult,
  EffectExpectation,
  EffectGateway,
  EffectRecorder,
  EmailEffect,
  JsonObject,
  JsonValue,
  PaymentEffect,
  RecordedEffect,
  RehearsalHandler,
  RehearsalReport,
  Scenario,
  Violation,
  ViolationKind,
} from './types.js';
