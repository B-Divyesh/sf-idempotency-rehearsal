import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(root, 'site/public/staticwebapp.config.json'), 'utf8')) as {
  globalHeaders: Record<string, string>;
  routes: Array<{ route: string; headers: Record<string, string> }>;
};
const styles = readFileSync(resolve(root, 'site/src/style.css'), 'utf8');

describe('static site delivery contract', () => {
  it('ships immutable asset caching and clickjacking-resistant CSP for Static Web Apps', () => {
    const csp = config.globalHeaders['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');

    const assets = config.routes.find((route) => route.route === '/assets/*');
    expect(assets?.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
    for (const path of ['/sw.js', '/index.html', '/']) {
      expect(config.routes.find((route) => route.route === path)?.headers['Cache-Control'])
        .toBe('no-cache, no-store, must-revalidate');
    }
  });

  it('declares 44px header-brand and footer-link hit areas', () => {
    expect(styles).toMatch(/\.brand\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/);
    expect(styles).toMatch(/footer > div:nth-of-type\(2\) a\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/);
  });
});
