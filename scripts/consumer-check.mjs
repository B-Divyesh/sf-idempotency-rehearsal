import { createServer } from 'node:http';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = resolve('.');
const workspace = await mkdtemp(join(tmpdir(), 'idempotency-rehearsal-consumer-'));
let packedFile;
let server;

try {
  const { stdout } = await execFile('npm', ['pack', '--json'], { cwd: root });
  const pack = JSON.parse(stdout)[0];
  packedFile = join(root, pack.filename);
  await writeFile(join(workspace, 'package.json'), JSON.stringify({ name: 'consumer-check', private: true, type: 'module' }));
  await execFile('npm', ['install', '--ignore-scripts', packedFile], { cwd: workspace });

  const packageUrl = pathToFileURL(join(workspace, 'node_modules/idempotency-rehearsal/dist/package/index.js')).href;
  const installed = await import(packageUrl);
  const claimed = new Set();
  const report = await installed.runScenario({
    scenario: installed.defineScenario({
      name: 'consumer duplicate',
      deliveries: [
        { eventId: 'evt_demo_consumer_original', idempotencyKey: 'order_demo_consumer', payload: { orderId: 'order_demo_consumer' } },
        { eventId: 'evt_demo_consumer_retry', idempotencyKey: 'order_demo_consumer', payload: { orderId: 'order_demo_consumer' } },
      ],
      expect: [{ adapter: 'email', action: 'send-receipt', idempotencyKey: 'order_demo_consumer', count: 1 }],
    }),
    handler: async (delivery, effects) => {
      if (claimed.has(delivery.idempotencyKey)) return;
      claimed.add(delivery.idempotencyKey);
      await effects.email({ action: 'send-receipt', idempotencyKey: delivery.idempotencyKey });
    },
  });
  if (!report.passed || report.summary.deliveries !== 2 || report.summary.effects !== 1) throw new Error('Installed ESM package did not prove the sample duplicate.');

  const cjs = await import('node:module').then(({ createRequire }) => createRequire(join(workspace, 'package.json'))('idempotency-rehearsal'));
  if (typeof cjs.runScenario !== 'function') throw new Error('Installed CommonJS package is missing runScenario.');

  const httpClaimed = new Set();
  server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const effects = installed.effectClientFromRequest(new Request('http://127.0.0.1/webhook', { headers: new Headers(request.headers) }));
    if (!httpClaimed.has(payload.orderId)) {
      httpClaimed.add(payload.orderId);
      await effects.payment({ action: 'capture', idempotencyKey: payload.orderId, amount: 2400, currency: 'USD' });
    }
    response.writeHead(204).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Consumer target did not bind.');
  const scenarioPath = join(workspace, 'scenario.json');
  await writeFile(scenarioPath, JSON.stringify({
    name: 'consumer CLI duplicate',
    deliveries: [
      { eventId: 'evt_demo_cli_original', idempotencyKey: 'order_demo_cli', payload: { orderId: 'order_demo_cli' } },
      { eventId: 'evt_demo_cli_retry', idempotencyKey: 'order_demo_cli', payload: { orderId: 'order_demo_cli' } },
    ],
    expect: [{ adapter: 'payment', action: 'capture', idempotencyKey: 'order_demo_cli', count: 1 }],
  }));
  const cliPath = join(workspace, 'node_modules/idempotency-rehearsal/dist/package/cli.js');
  const cli = await execFile(process.execPath, [cliPath, 'run', scenarioPath, '--target', `http://127.0.0.1:${address.port}/webhook`, '--json'], { cwd: workspace });
  const cliReport = JSON.parse(cli.stdout);
  if (!cliReport.passed || cliReport.summary.deliveries !== 2 || cliReport.summary.effects !== 1) throw new Error('Installed CLI did not prove the sample duplicate.');

  const browserEntry = await import(pathToFileURL(join(workspace, 'node_modules/idempotency-rehearsal/dist/package/browser.js')).href);
  if (typeof browserEntry.runScenario !== 'function' || typeof browserEntry.runHttpScenario !== 'undefined') {
    throw new Error('Installed browser entry does not expose the browser-safe surface.');
  }

  const license = await readFile(join(workspace, 'node_modules/idempotency-rehearsal/LICENSE'), 'utf8');
  if (!license.includes('MIT License')) throw new Error('Installed package is missing the MIT license.');
  console.log('consumer package: ESM, CommonJS, browser entry, and CLI passed a duplicate webhook proof');
} finally {
  if (server) await new Promise((resolve) => server.close(() => resolve()));
  if (packedFile) await rm(packedFile, { force: true });
  await rm(workspace, { recursive: true, force: true });
}
