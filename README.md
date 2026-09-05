# Idempotency Rehearsal

Prove webhook retries cause one effect.

Idempotency Rehearsal is for backend engineers who need to catch duplicate,
delayed, and reordered webhook actions before release. It is a local TypeScript
library and CLI for integration tests.

Try the [sample browser playground](https://idempotency-rehearsal.sociobot.in/demo?demo=1).
It runs two synthetic deliveries and displays the recorded payment effect. The
demo uses the `demo:` browser namespace and Reset demo returns it to an empty
result.

## Install

```sh
npm install --save-dev idempotency-rehearsal
```

The package provides ESM, CommonJS, a browser-safe entry, and a CLI. It is
MIT-licensed and runs in the Node environment used by your test suite.

## In-process test

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

The payment and email adapters record effects without calling a provider.
Reports omit payload values and raw handler error text.

## HTTP handler test

```ts
import { runHttpScenario, assertIdempotent } from 'idempotency-rehearsal';

const report = await runHttpScenario({
  scenario,
  url: 'http://127.0.0.1:3000/webhooks/orders',
});

assertIdempotent(report);
```

HTTP rehearsals only target a loopback URL. In test-only handler wiring, use
`effectClientFromRequest(request)` in place of payment or email clients. The
library starts a temporary loopback collector and sends its URL in the
`x-idempotency-rehearsal-effect-url` request header.

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

Scenarios require synthetic identifiers. They reject live-looking identifiers
and secret-bearing payload fields.

## Browser playground entry

Use the browser-safe entry for an in-process playground. It omits the Node HTTP
collector.

```ts
import { createEffectRecorder, runScenario } from 'idempotency-rehearsal/browser';
```

The hosted demo uses this entry. It runs offline after its first visit and sends
requests only to the product origin. It uses no analytics request.

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
  --target http://127.0.0.1:3000/webhooks/orders --json
```

## Development and verification

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm run test:consumer
npm run test:claims
```

Each public claim is listed in `.factory/claims.json`. Run an individual claim
from a clean checkout with its documented command. The browser checks use the
shipped `/demo?demo=1` sample and a local static server.

To inspect the site locally after building:

```sh
npx vite preview --config site/vite.config.ts
```

Deploy `dist/site` to static hosting. The factory owns registry credentials;
use `npm pack --dry-run` to inspect a release and do not publish from this
repository worker.

## Privacy and license

Read the hosted [privacy notice](https://idempotency-rehearsal.sociobot.in/privacy)
and [terms](https://idempotency-rehearsal.sociobot.in/terms). The source is
licensed under [MIT](LICENSE).
