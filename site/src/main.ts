import './style.css';
import { createEffectRecorder, defineScenario, runScenario, type RehearsalReport } from '../../src/browser.js';

type DemoMode = 'idempotent' | 'broken' | 'reordered';

const DEMO_NAMESPACE = 'demo:idempotency-rehearsal:active';
const demo = document.querySelector<HTMLElement>('[data-demo-playground]');
const status = document.querySelector<HTMLElement>('#demo-status');
const result = document.querySelector<HTMLElement>('#demo-result');
const deliveries = document.querySelector<HTMLOListElement>('#demo-deliveries');
const effects = document.querySelector<HTMLOListElement>('#demo-effects');
const runButton = document.querySelector<HTMLButtonElement>('#run-sample');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-demo');
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const routeAnnouncement = document.querySelector<HTMLElement>('#route-announcement');
const offline = document.querySelector<HTMLElement>('#offline-status');

let mode: DemoMode = 'idempotent';
let runToken = 0;

function announceRoute(): void {
  const title = document.querySelector('h1')?.textContent?.trim();
  if (routeAnnouncement && title) routeAnnouncement.textContent = title;
}

function setStatus(text: string, state: 'ready' | 'running' | 'passed' | 'failed' = 'ready'): void {
  if (!status) return;
  status.textContent = text;
  status.dataset.state = state;
}

function renderEmpty(): void {
  deliveries?.replaceChildren();
  effects?.replaceChildren();
  if (result) {
    result.dataset.state = 'ready';
    result.innerHTML = '<strong>Sample is ready.</strong><span>Select a handler and run two synthetic deliveries.</span>';
  }
  setStatus('Ready', 'ready');
  if (runButton) {
    runButton.disabled = false;
    runButton.textContent = 'Run sample scenario';
  }
}

function addDelivery(report: RehearsalReport): void {
  if (!deliveries) return;
  for (const delivery of report.deliveries) {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${delivery.index + 1}. ${delivery.eventId}</strong><span>${delivery.status} · ${delivery.idempotencyKey}</span>`;
    deliveries.append(item);
  }
}

function addEffects(report: RehearsalReport): void {
  if (!effects) return;
  for (const effect of report.effects) {
    const item = document.createElement('li');
    item.innerHTML = `<strong>${effect.adapter}.${effect.action}</strong><span>${effect.idempotencyKey}</span>`;
    effects.append(item);
  }
}

function sampleScenario() {
  const duplicate = { eventId: 'evt_demo_order_retry', idempotencyKey: 'order_demo_042', payload: { orderId: 'order_demo_042', total: 2400 }, afterMs: 40 };
  const original = { eventId: 'evt_demo_order_created', idempotencyKey: 'order_demo_042', payload: { orderId: 'order_demo_042', total: 2400 } };
  const deliveries = mode === 'reordered' ? [duplicate, original] : [original, duplicate];
  return defineScenario({
    name: 'sample duplicate order',
    deliveries,
    expect: [{ adapter: 'payment', action: 'capture', idempotencyKey: 'order_demo_042', count: 1 }],
  });
}

async function runSample(): Promise<void> {
  if (!demo || runButton?.disabled) return;
  const token = ++runToken;
  renderEmpty();
  setStatus('Running sample', 'running');
  if (runButton) {
    runButton.disabled = true;
    runButton.textContent = 'Running sample…';
  }

  const claimed = new Set<string>();
  const report = await runScenario({
    scenario: sampleScenario(),
    recorder: createEffectRecorder(),
    handler: async (delivery, effectRecorder) => {
      if (mode !== 'broken' && claimed.has(delivery.idempotencyKey)) return;
      claimed.add(delivery.idempotencyKey);
      await effectRecorder.payment({ action: 'capture', idempotencyKey: delivery.idempotencyKey, amount: 2400, currency: 'USD' });
    },
  });
  if (token !== runToken) return;

  addDelivery(report);
  addEffects(report);
  const passed = report.passed;
  if (result) {
    result.dataset.state = passed ? 'passed' : 'failed';
    result.innerHTML = passed
      ? `<strong>PASS — one payment effect.</strong><span>${report.summary.deliveries} deliveries produced ${report.summary.effects} recorded effect.</span>`
      : `<strong>FAIL — duplicate payment effect.</strong><span>${report.summary.deliveries} deliveries produced ${report.summary.effects} recorded effects. Fix the handler before release.</span>`;
  }
  setStatus(passed ? 'Passed' : 'Failed', passed ? 'passed' : 'failed');
  if (runButton) {
    runButton.disabled = false;
    runButton.textContent = 'Run sample again';
  }
}

function selectMode(tab: HTMLButtonElement): void {
  mode = (tab.dataset.mode ?? 'idempotent') as DemoMode;
  tabs.forEach((candidate) => {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('#demo-panel')?.setAttribute('aria-labelledby', tab.id);
  runToken += 1;
  renderEmpty();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMode(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (next) {
      selectMode(next);
      next.focus();
    }
  });
});

runButton?.addEventListener('click', () => void runSample());
resetButton?.addEventListener('click', () => {
  runToken += 1;
  sessionStorage.setItem(DEMO_NAMESPACE, 'active');
  renderEmpty();
  resetButton.focus();
});

document.querySelectorAll<HTMLElement>('[data-leave-demo]').forEach((link) => {
  link.addEventListener('click', () => sessionStorage.removeItem(DEMO_NAMESPACE));
});

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const message = document.querySelector<HTMLElement>('#copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      if (message) message.textContent = 'Install command copied.';
    } catch {
      if (message) message.textContent = 'Clipboard access was blocked. Select the command manually.';
    }
  });
});

function updateNetworkState(): void {
  if (offline) offline.hidden = navigator.onLine;
}

window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);
updateNetworkState();
announceRoute();

if (demo) {
  sessionStorage.setItem(DEMO_NAMESPACE, 'active');
  renderEmpty();
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
