import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const entry = fileURLToPath(new URL('../src/worker.ts', import.meta.url));
const bundled = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'neutral', write: false });
const source = bundled.outputFiles[0].text;
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  calls.push({ url, redirect: options.redirect });
  if (url === 'https://example.com/old') {
    return new Response(null, { status: 301, headers: { location: '/new' } });
  }
  return new Response('<title>Example page</title><link rel="canonical" href="/new">', {
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }
  });
};

try {
  const request = new Request('https://statusgrid.pages.dev/api/check/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
    body: JSON.stringify({ urls: ['https://example.com/old', 'http://127.0.0.1/'] })
  });
  const env = { ASSETS: { fetch: async () => new Response('static page') } };
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  const { results } = await response.json();
  assert.equal(results[0].status, 200);
  assert.equal(results[0].hops.length, 2);
  assert.equal(results[0].finalUrl, 'https://example.com/new');
  assert.equal(results[0].title, 'Example page');
  assert.equal(results[0].canonical, 'https://example.com/new');
  assert.equal(results[1].errorType, 'input');
  assert.deepEqual(calls.map(call => call.url), ['https://example.com/old', 'https://example.com/new']);
  assert.ok(calls.every(call => call.redirect === 'manual'));
  const methodResponse = await worker.fetch(new Request('https://statusgrid.pages.dev/api/check/'), env);
  assert.equal(methodResponse.status, 405);
  const assetResponse = await worker.fetch(new Request('https://statusgrid.pages.dev/'), env);
  assert.equal(await assetResponse.text(), 'static page');
  process.stdout.write('Cloudflare Worker smoke check passed.\n');
} finally {
  globalThis.fetch = originalFetch;
}
