import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const configPath = resolve('dist/site/staticwebapp.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
const fail = (message) => {
  throw new Error(`Static Web Apps configuration failed: ${message}`);
};
const csp = config.globalHeaders?.['Content-Security-Policy'];
for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) {
  if (!csp?.includes(directive)) fail(`CSP is missing ${directive}`);
}
if (config.globalHeaders?.['X-Frame-Options'] !== 'DENY') fail('X-Frame-Options must be DENY');
if (config.navigationFallback?.rewrite !== '/404.html') fail('navigation fallback must render the product 404 page');
if (config.responseOverrides?.['404']?.rewrite !== '/404.html') fail('HTTP 404 responses must render the product 404 page');

const routeHeader = (path) => config.routes?.find((route) => route.route === path)?.headers?.['Cache-Control'];
if (routeHeader('/assets/*') !== 'public, max-age=31536000, immutable') {
  fail('/assets/* must be cached for one year with immutable');
}
for (const path of ['/sw.js', '/index.html', '/', '/demo', '/privacy', '/terms']) {
  if (routeHeader(path) !== 'no-cache, no-store, must-revalidate') {
    fail(`${path} must be revalidated`);
  }
}

console.log('static config: immutable /assets caching and CSP/frame protection verified in dist/site');
