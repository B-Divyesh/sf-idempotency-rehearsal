import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

function fileForPath(pathname) {
  const routes = new Map([
    ['/', 'index.html'],
    ['/demo', 'demo/index.html'], ['/demo/', 'demo/index.html'],
    ['/privacy', 'privacy/index.html'], ['/privacy/', 'privacy/index.html'],
    ['/terms', 'terms/index.html'], ['/terms/', 'terms/index.html'],
    ['/404', '404.html'], ['/404.html', '404.html'],
  ]);
  if (routes.has(pathname)) return { file: routes.get(pathname), status: 200 };
  if (pathname.startsWith('/assets/') || ['/favicon.svg', '/robots.txt', '/sitemap.xml', '/sw.js', '/staticwebapp.config.json'].includes(pathname)) {
    return { file: pathname.slice(1), status: 200 };
  }
  return { file: '404.html', status: 404 };
}

export async function startSiteServer(root = resolve('dist/site')) {
  const siteRoot = resolve(root);
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    const target = fileForPath(url.pathname);
    const file = normalize(join(siteRoot, target.file));
    if (!file.startsWith(`${siteRoot}/`) && file !== siteRoot) {
      response.writeHead(400).end();
      return;
    }
    try {
      const data = await readFile(file);
      response.writeHead(target.status, {
        'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': file.endsWith('sw.js') || file.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start the static site server.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
