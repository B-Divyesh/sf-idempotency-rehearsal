import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const baseUrl = (process.env.REHEARSAL_SITE_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
const routes = [
  ['/', 'Idempotency Rehearsal — prove webhook retries'],
  ['/demo?demo=1', 'Demo — Idempotency Rehearsal'],
  ['/privacy', 'Privacy — Idempotency Rehearsal'],
  ['/terms', 'Terms — Idempotency Rehearsal'],
  ['/missing-page', 'Page not found — Idempotency Rehearsal'],
];
const browser = await chromium.launch();
const failures = [];
const browserErrors = [];

for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
  for (const [route, expectedTitle] of routes) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('console', (message) => {
      const expected404 = route === '/missing-page' && message.text().includes('404');
      if (message.type() === 'error' && !expected404) browserErrors.push(`${viewport.width}px ${route}: ${message.text()}`);
    });
    page.on('pageerror', (error) => browserErrors.push(`${viewport.width}px ${route}: ${error.message}`));
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (title !== expectedTitle) failures.push(`${viewport.width}px ${route}: expected title ${expectedTitle}, received ${title}`);
    if (await page.locator('html').getAttribute('lang') !== 'en') failures.push(`${viewport.width}px ${route}: missing lang=en`);
    if (await page.locator('main').count() !== 1) failures.push(`${viewport.width}px ${route}: expected one main landmark`);
    if (await page.locator('h1').count() !== 1) failures.push(`${viewport.width}px ${route}: expected one h1`);
    const missingAlt = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.hasAttribute('alt')).length);
    if (missingAlt) failures.push(`${viewport.width}px ${route}: image without alt text`);
    if (viewport.width === 390) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflow) failures.push(`${viewport.width}px ${route}: horizontal overflow`);
      const targets = await page.locator('.site-header .brand, .footer-links a').evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { text: element.textContent?.trim(), width: box.width, height: box.height };
      }));
      for (const target of targets) if (target.width < 44 || target.height < 44) failures.push(`${viewport.width}px ${route}: touch target below 44px (${target.text} ${target.width}×${target.height})`);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    for (const violation of results.violations) failures.push(`${viewport.width}px ${route}: ${violation.impact ?? 'unknown'} axe ${violation.id}`);
    await context.close();
  }
}

const keyboardContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const keyboardPage = await keyboardContext.newPage();
await keyboardPage.goto(`${baseUrl}/demo?demo=1`, { waitUntil: 'networkidle' });
await keyboardPage.keyboard.press('Tab');
if (await keyboardPage.locator('.skip-link:focus').count() !== 1) failures.push('keyboard: first Tab does not focus the skip link');
await keyboardPage.getByRole('tab', { name: 'Idempotent handler' }).focus();
await keyboardPage.keyboard.press('ArrowRight');
if (await keyboardPage.getByRole('tab', { name: 'Broken handler' }).getAttribute('aria-selected') !== 'true') failures.push('keyboard: ArrowRight does not select Broken handler');
await keyboardPage.getByRole('button', { name: 'Run sample scenario' }).press('Enter');
await keyboardPage.getByText('FAIL — duplicate payment effect.').waitFor();
const reduced = await keyboardPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.querySelector('.button')).transitionDuration);
if (!['0.01ms', '1e-05s'].includes(reduced)) failures.push(`reduced motion: unexpected transition duration ${reduced}`);
await keyboardContext.close();
await browser.close();

if (failures.length || browserErrors.length) {
  for (const failure of [...failures, ...browserErrors]) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`browser/axe: 0 errors or WCAG A/AA violations on ${routes.length} routes at ${baseUrl}; mobile targets, keyboard, and reduced motion passed`);
}
