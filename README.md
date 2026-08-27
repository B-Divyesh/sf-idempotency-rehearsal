# Idempotency Rehearsal

Prove that duplicate, delayed, and out-of-order webhook deliveries create one business effect—not two.

Idempotency Rehearsal is a zero-runtime-dependency TypeScript library and CLI for local integration tests. It delivers a named synthetic event sequence to a function or HTTP endpoint, records effects through deliberately inert payment/email/custom adapters, and fails with a compact, secret-safe report when one logical action is repeated.

## Install

```sh
npm install --save-dev idempotency-rehearsal
```

Requires Node.js 20 or newer. The package ships ESM, CommonJS, and TypeScript declarations.

## Usage: in-process test

```ts
import {
  assertIdempotent,
  createEffectRecorder,
  defineScenario,
  runScenario,
} from 'idempotency-rehearsal';

const scenario = defineScenario({
  name: 'invoice duplicate after retry',
  deliveries: [
    { eventId: 'evt_demo_01', idempotencyKey: 'invoice_demo_01', payload: { total: 2400 } },
    { eventId: 'evt_demo_01_retry', idempotencyKey: 'invoice_demo_01', payload: { total: 2400 }, afterMs: 25 },
  ],
  expect: [{ adapter: 'payment', action: 'capture', idempotencyKey: 'invoice_demo_01', count: 1 }],
});

const recorder = createEffectRecorder();
const claimed = new Set<string>();

const report = await runScenario({
  scenario,
  recorder,
  handler: async (delivery, effects) => {
    if (claimed.has(delivery.idempotencyKey)) return;
    claimed.add(delivery.idempotencyKey);
    await effects.payment({
      action: 'capture',
      idempotencyKey: delivery.idempotencyKey,
      amount: delivery.payload.total as number,
      currency: 'USD',
    });
  },
});

assertIdempotent(report);
```

The `payment` and `email` adapters only record intent. They never contact a provider. Payloads and effect metadata are not copied into the report.

## Usage: HTTP handler

```ts
import { runHttpScenario, assertIdempotent } from 'idempotency-rehearsal';

const report = await runHttpScenario({
  scenario,
  url: 'http://127.0.0.1:3000/webhooks/orders',
});

assertIdempotent(report);
```

During a run, the library starts a loopback-only effect collector and adds its URL in the `x-idempotency-rehearsal-effect-url` request header. In your handler's test-only wiring, use `effectClientFromRequest(request)` in place of real payment/email clients:

```ts
import { effectClientFromRequest } from 'idempotency-rehearsal';

export async function POST(request: Request) {
  const event = await request.json();
  const effects = effectClientFromRequest(request);
  await effects.email({
    action: 'send-receipt',
    idempotencyKey: event.orderId,
    template: 'receipt',
  });
  return new Response(null, { status: 204 });
}
```

`effectClientFromRequest` refuses non-loopback collector URLs. Keep this adapter in test wiring only.

## CLI

Create `rehearsal.json`:

```json
{
  "name": "delayed duplicate",
  "deliveries": [
    { "eventId": "evt_demo_01", "idempotencyKey": "order_demo_01", "payload": { "orderId": "order_demo_01" } },
    { "eventId": "evt_demo_01_retry", "idempotencyKey": "order_demo_01", "payload": { "orderId": "order_demo_01" }, "afterMs": 100 }
  ],
  "expect": [
    { "adapter": "email", "action": "send-receipt", "idempotencyKey": "order_demo_01", "count": 1 }
  ]
}
```

```sh
npx idempotency-rehearsal run rehearsal.json \
  --target http://127.0.0.1:3000/webhooks/orders

# Stable machine-readable output; exit 1 on an idempotency failure.
npx idempotency-rehearsal run rehearsal.json \
  --target http://127.0.0.1:3000/webhooks/orders --json
```

Run `npx idempotency-rehearsal --help` for all options and exit codes.

## Scenario format

- `name`: human-readable proof name.
- `deliveries`: ordered synthetic events. `afterMs` delays that delivery relative to the preceding one; `parallelGroup` sends matching deliveries concurrently.
- `expect`: exact counts for `(adapter, action, idempotencyKey)`. Any unlisted effect is allowed once and fails when duplicated.
- Test identifiers must be synthetic. The library rejects likely live Stripe-style keys and authorization-like fields before delivery.

Reports contain identifiers, timing, statuses, and effect counts. They intentionally omit payloads, request headers, and effect metadata; in-process handler failures are reported only as the stable `Handler failed.` category, never as a handler's raw error text.

## Development

```sh
npm ci
npm test
npm run build          # package -> dist/package, site -> dist/site
npm run pack:check     # validates the publishable tarball
npm run dev            # documentation/demo site
```

The documented examples are exercised by the test suite. No telemetry, analytics, remote fonts, or third-party runtime scripts are used.

## Deploy and publish

Static hosting should serve `dist/site` (its root contains `index.html`). The factory owns npm credentials; a release operator can inspect `npm pack --dry-run` and publish the package after version review. Do not publish from a build worker.

## License

MIT © 2026 Sociobot (Param Factory).
