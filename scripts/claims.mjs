import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { startSiteServer } from './site-server.mjs';

const builtBrowser = pathToFileURL(resolve('dist/package/browser.js')).href;
const builtNode = pathToFileURL(resolve('dist/package/index.js')).href;
const grepIndex = process.argv.indexOf('--grep');
const grep = grepIndex >= 0 ? process.argv[grepIndex + 1] : undefined;

if (!existsSync(resolve('dist/site/index.html')) || !existsSync(resolve('dist/package/browser.js'))) {
  throw new Error('Build the package and site first: npm run build');
}

const browserApi = await import(builtBrowser);
const nodeApi = await import(builtNode);
const server = await startSiteServer();
const browser = await chromium.launch();
const consoleErrors = [];

async function newPage(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return { context, page };
}

const claims = [
  {
    id: 'demo-one-click',
    run: async () => {
      const { context, page } = await newPage();
      await page.goto(`${server.origin}/demo?demo=1`, { waitUntil: 'networkidle' });
      await assertBanner(page);
      await page.getByRole('button', { name: 'Run sample scenario' }).click();
      await page.getByText('PASS — one payment effect.').waitFor();
      assert.equal(await page.locator('#demo-deliveries li').count(), 2);
      assert.equal(await page.locator('#demo-effects li').count(), 1);
      await context.close();
    },
  },
  {
    id: 'demo-reset-isolation',
    run: async () => {
      const { context, page } = await newPage();
      await page.goto(`${server.origin}/demo?demo=1`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Run sample scenario' }).click();
      await page.getByText('PASS — one payment effect.').waitFor();
      const storageBefore = await page.evaluate(() => ({
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      }));
      assert.deepEqual(storageBefore.local, []);
      assert.deepEqual(storageBefore.session, ['demo:idempotency-rehearsal:active']);
      await page.getByRole('button', { name: 'Reset demo' }).click();
      await page.getByText('Sample is ready.').waitFor();
      assert.equal(await page.locator('#demo-deliveries li').count(), 0);
      assert.equal(await page.locator('#demo-effects li').count(), 0);
      await context.close();
    },
  },
  {
    id: 'duplicate-detection',
    run: async () => {
      const { context, page } = await newPage();
      await page.goto(`${server.origin}/demo?demo=1`, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'Broken handler' }).click();
      await page.getByRole('button', { name: 'Run sample scenario' }).click();
      await page.getByText('FAIL — duplicate payment effect.').waitFor();
      assert.equal(await page.locator('#demo-effects li').count(), 2);
      await page.getByRole('tab', { name: 'Idempotent handler' }).click();
      await page.getByRole('button', { name: 'Run sample scenario' }).click();
      await page.getByText('PASS — one payment effect.').waitFor();
      await context.close();
    },
  },
  {
    id: 'reordered-sample',
    run: async () => {
      const { context, page } = await newPage();
      await page.goto(`${server.origin}/demo?demo=1`, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'Reordered delivery' }).click();
      await page.getByRole('button', { name: 'Run sample scenario' }).click();
      await page.getByText('PASS — one payment effect.').waitFor();
      const firstDelivery = await page.locator('#demo-deliveries li').first().innerText();
      assert.match(firstDelivery, /evt_demo_order_retry/);
      await context.close();
    },
  },
  {
    id: 'offline-demo',
    run: async () => {
      const { context, page } = await newPage();
      await page.goto(`${server.origin}/demo?demo=1`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.reload({ waitUntil: 'networkidle' });
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await assertBanner(page);
      await page.getByRole('heading', { level: 1, name: 'Run a sample duplicate webhook' }).waitFor();
      await context.setOffline(false);
      await context.close();
    },
  },
  {
    id: 'same-origin-demo',
    run: async () => {
      const { context, page } = await newPage();
      const requests = [];
      page.on('request', (request) => requests.push(request.url()));
      await page.goto(`${server.origin}/demo?demo=1`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Run sample scenario' }).click();
      await page.getByText('PASS — one payment effect.').waitFor();
      assert.ok(requests.length > 0);
      assert.ok(requests.every((url) => new URL(url).origin === server.origin), `Unexpected request: ${requests.join(', ')}`);
      await context.close();
    },
  },
  {
    id: 'inert-adapters',
    run: async () => {
      const recorder = browserApi.createEffectRecorder();
      const originalFetch = globalThis.fetch;
      let calls = 0;
      globalThis.fetch = async (...args) => { calls += 1; return originalFetch(...args); };
      try {
        await recorder.payment({ action: 'capture', idempotencyKey: 'order_demo_adapter', amount: 2400, currency: 'USD' });
        await recorder.email({ action: 'send-receipt', idempotencyKey: 'order_demo_adapter', template: 'receipt' });
      } finally {
        globalThis.fetch = originalFetch;
      }
      assert.equal(calls, 0);
      assert.deepEqual(recorder.effects.map((effect) => `${effect.adapter}.${effect.action}`), ['payment.capture', 'email.send-receipt']);
    },
  },
  {
    id: 'secret-safe-report',
    run: async () => {
      const marker = 'raw-secret-should-not-appear';
      const report = await browserApi.runScenario({
        scenario: browserApi.defineScenario({ name: 'report redaction', deliveries: [{ eventId: 'evt_demo_redaction', idempotencyKey: 'order_demo_redaction', payload: { note: marker } }] }),
        handler: (delivery) => { throw new Error(`handler failed with ${delivery.payload.note}`); },
      });
      assert.equal(report.deliveries[0].error, 'Handler failed.');
      assert.ok(!JSON.stringify(report).includes(marker));
    },
  },
  {
    id: 'loopback-only',
    run: async () => {
      const scenario = nodeApi.defineScenario({ name: 'remote refusal', deliveries: [{ eventId: 'evt_demo_remote', idempotencyKey: 'order_demo_remote', payload: {} }] });
      await assert.rejects(nodeApi.runHttpScenario({ scenario, url: 'https://example.com/webhook' }), /loopback/);
    },
  },
  {
    id: 'synthetic-identifiers',
    run: async () => {
      assert.throws(() => browserApi.defineScenario({ name: 'live identifier', deliveries: [{ eventId: 'evt_live_123', idempotencyKey: 'order_demo_123', payload: {} }] }), /live identifier/);
      assert.throws(() => browserApi.defineScenario({ name: 'secret field', deliveries: [{ eventId: 'evt_demo_secret', idempotencyKey: 'order_demo_secret', payload: { token: 'not-used' } }] }), /secret-bearing/);
    },
  },
  {
    id: 'local-package',
    run: async () => {
      const { default: runConsumerCheck } = await import('./run-consumer-check.mjs');
      await runConsumerCheck();
    },
  },
];

async function assertBanner(page) {
  await page.getByText('Demo — sample data, nothing is saved').waitFor();
  await page.getByRole('button', { name: 'Reset demo' }).waitFor();
  await page.getByRole('link', { name: 'Start for real' }).waitFor();
}

try {
  const selected = claims.filter((claim) => !grep || `@claim:${claim.id}`.includes(grep));
  if (!selected.length) throw new Error(`No claim test matches ${grep}.`);
  for (const claim of selected) {
    await claim.run();
    console.log(`PASS @claim:${claim.id}`);
  }
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join('\n')}`);
} finally {
  await browser.close();
  await server.close();
}
