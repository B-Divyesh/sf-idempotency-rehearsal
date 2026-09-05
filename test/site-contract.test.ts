import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(root, 'site/public/staticwebapp.config.json'), 'utf8')) as {
  globalHeaders: Record<string, string>;
  responseOverrides?: Record<string, { rewrite: string }>;
  routes: Array<{ route: string; headers: Record<string, string> }>;
};

describe('static site delivery contract', () => {
  it('ships restrictive headers, immutable assets, and a product-owned not-found page', () => {
    const csp = config.globalHeaders['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(config.responseOverrides?.['404']?.rewrite).toBe('/404.html');

    const routeHeader = (path: string) => config.routes.find((route) => route.route === path)?.headers['Cache-Control'];
    expect(routeHeader('/assets/*')).toBe('public, max-age=31536000, immutable');
    for (const path of ['/sw.js', '/index.html', '/', '/demo', '/privacy', '/terms']) {
      expect(routeHeader(path)).toBe('no-cache, no-store, must-revalidate');
    }
  });
});
