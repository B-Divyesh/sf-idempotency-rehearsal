import './style.css';

type Mode = 'safe' | 'broken' | 'reorder';
type LabState = 'ready' | 'running' | 'passed' | 'failed';

const lab = document.querySelector<HTMLElement>('.lab');
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const runButton = document.querySelector<HTMLButtonElement>('#run-demo');
const stateLabel = document.querySelector<HTMLElement>('#lab-state');
const verdict = document.querySelector<HTMLElement>('#verdict');
const eventItems = [...document.querySelectorAll<HTMLLIElement>('[data-event]')];
const effectList = document.querySelector<HTMLOListElement>('#effect-list');
const emptyOutput = document.querySelector<HTMLElement>('#empty-output');
const deliveryCount = document.querySelector<HTMLElement>('#delivery-count');
const effectCount = document.querySelector<HTMLElement>('#effect-count');
const copyStatus = document.querySelector<HTMLElement>('#copy-status');
const offline = document.querySelector<HTMLElement>('#offline');
let mode: Mode = 'safe';
let runToken = 0;

const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));
const delay = (duration: number) => matchMedia('(prefers-reduced-motion: reduce)').matches ? wait(10) : wait(duration);

function setState(state: LabState, label: string): void {
  if (lab) lab.dataset.state = state;
  if (stateLabel) stateLabel.innerHTML = `<i aria-hidden="true"></i> ${label}`;
}

function reset(): void {
  runToken += 1;
  eventItems.forEach((item, index) => {
    item.className = '';
    const status = item.querySelector<HTMLElement>('.event-status');
    if (status) status.textContent = index === 0 ? 'queued' : mode === 'reorder' ? 'arrives first' : '+250 ms';
  });
  effectList?.replaceChildren();
  if (emptyOutput) emptyOutput.hidden = false;
  if (deliveryCount) deliveryCount.textContent = '0/2';
  if (effectCount) effectCount.textContent = '0';
  if (runButton) runButton.innerHTML = 'Start rehearsal <span aria-hidden="true">▶</span>';
  if (verdict) verdict.firstElementChild!.innerHTML = '<span class="verdict-symbol" aria-hidden="true">?</span><span><strong>Awaiting proof</strong><small>Two synthetic deliveries are ready.</small></span>';
  setState('ready', 'Ready');
}

function addEffect(duplicate: boolean): void {
  if (emptyOutput) emptyOutput.hidden = true;
  const item = document.createElement('li');
  if (duplicate) item.className = 'duplicate';
  item.innerHTML = `<span class="event-index">${duplicate ? '02' : '01'}</span><span><strong>payment.capture</strong><code>key: order_demo_042</code></span><span class="effect-badge">${duplicate ? 'DUPLICATE' : 'RECORDED'}</span>`;
  effectList?.append(item);
  if (effectCount) effectCount.textContent = String(effectList?.children.length ?? 0);
}

async function run(): Promise<void> {
  if (lab?.dataset.state === 'running') return;
  reset();
  const token = ++runToken;
  setState('running', 'Running');
  if (runButton) {
    runButton.disabled = true;
    runButton.textContent = 'Delivering events…';
  }
  const order = mode === 'reorder' ? [1, 0] : [0, 1];
  for (let step = 0; step < order.length; step += 1) {
    if (token !== runToken) return;
    const item = eventItems[order[step] ?? step];
    if (!item) continue;
    item.className = 'active';
    const status = item.querySelector<HTMLElement>('.event-status');
    if (status) status.textContent = 'delivering';
    await delay(step === 0 ? 300 : 420);
    item.className = 'done';
    if (status) status.textContent = 'accepted';
    if (deliveryCount) deliveryCount.textContent = `${step + 1}/2`;
    if (step === 0 || mode === 'broken') addEffect(step > 0);
  }
  if (token !== runToken) return;
  const failed = mode === 'broken';
  setState(failed ? 'failed' : 'passed', failed ? 'Failed' : 'Passed');
  if (verdict) verdict.firstElementChild!.innerHTML = failed
    ? '<span class="verdict-symbol" aria-hidden="true">×</span><span><strong>FAIL · duplicate effect</strong><small>payment.capture ran twice for order_demo_042.</small></span>'
    : '<span class="verdict-symbol" aria-hidden="true">✓</span><span><strong>PASS · exactly one effect</strong><small>Both deliveries were accepted; the second action was suppressed.</small></span>';
  if (runButton) {
    runButton.disabled = false;
    runButton.innerHTML = 'Run again <span aria-hidden="true">↻</span>';
  }
}

function selectTab(tab: HTMLButtonElement): void {
  mode = (tab.dataset.mode ?? 'safe') as Mode;
  tabs.forEach((candidate) => {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('#trace-panel')?.setAttribute('aria-labelledby', tab.id);
  reset();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (next) { selectTab(next); next.focus(); }
  });
});

runButton?.addEventListener('click', () => void run());

document.querySelectorAll<HTMLButtonElement>('[data-copy], [data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const targetId = button.dataset.copyTarget;
    const value = button.dataset.copy ?? (targetId ? document.querySelector(`#${targetId}`)?.textContent : '') ?? '';
    try {
      await navigator.clipboard.writeText(value.trim());
      if (copyStatus) copyStatus.textContent = 'Copied to clipboard.';
      const original = button.innerHTML;
      button.textContent = 'Copied ✓';
      setTimeout(() => { button.innerHTML = original; }, 1600);
    } catch {
      if (copyStatus) copyStatus.textContent = 'Clipboard access was blocked. Select the command manually.';
    }
  });
});

function updateNetworkState(): void {
  if (offline) offline.hidden = navigator.onLine;
}
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);
updateNetworkState();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
