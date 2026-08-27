import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const url = process.env.REHEARSAL_SITE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const viewports = [{ width: 390, height: 844 }, { width: 1366, height: 900 }];
const violations = [];
const targetFailures = [];
const browserErrors = [];
for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push({ viewport, message: message.text() });
  });
  page.on('pageerror', (error) => browserErrors.push({ viewport, message: error.message }));
  await page.goto(url, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  violations.push(...results.violations.map((violation) => ({ ...violation, viewport })));
  if (viewport.width === 390) {
    const targets = await page.locator('.site-header .brand, footer > div:nth-of-type(2) a').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.textContent?.trim(), width: rect.width, height: rect.height };
      }),
    );
    targetFailures.push(...targets.filter((target) => target.width < 44 || target.height < 44));
  }
  await context.close();
}
await browser.close();

if (violations.length) {
  for (const violation of violations) {
    console.error(`${violation.impact ?? 'unknown'}: ${violation.id} — ${violation.help}`);
    for (const node of violation.nodes) console.error(`  ${node.target.join(' ')}`);
  }
  process.exitCode = 1;
} else if (targetFailures.length) {
  for (const target of targetFailures) {
    console.error(`touch target below 44px: ${target.label} (${target.width}×${target.height})`);
  }
  process.exitCode = 1;
} else if (browserErrors.length) {
  for (const error of browserErrors) {
    console.error(`browser error at ${error.viewport.width}px: ${error.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`browser/axe: 0 errors or WCAG A/AA violations at ${url} (mobile + desktop); 390px header/footer targets are at least 44px`);
}
