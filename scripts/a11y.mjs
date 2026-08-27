import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const url = process.env.REHEARSAL_SITE_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch();
const viewports = [{ width: 390, height: 844 }, { width: 1366, height: 900 }];
const violations = [];
for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  violations.push(...results.violations.map((violation) => ({ ...violation, viewport })));
  await context.close();
}
await browser.close();

if (violations.length) {
  for (const violation of violations) {
    console.error(`${violation.impact ?? 'unknown'}: ${violation.id} — ${violation.help}`);
    for (const node of violation.nodes) console.error(`  ${node.target.join(' ')}`);
  }
  process.exitCode = 1;
} else {
  console.log(`axe: 0 WCAG A/AA violations at ${url} (mobile + desktop)`);
}
