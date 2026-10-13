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
  if (url === 'https://www.google.com/') {
    return new Response(null, { status: 302, headers: { location: '/sorry/index?continue=https://www.google.com/' } });
  }
  if (url.startsWith('https://www.google.com/sorry/')) {
    return new Response('<title>Unusual traffic</title>', { status: 429, headers: { 'content-type': 'text/html' } });
  }
  if (url === 'https://chatgpt.com/') {
    return new Response('Forbidden', { status: 403, headers: { 'content-type': 'text/plain' } });
  }
  return new Response('<title>Example page</title><link rel="canonical" href="/new">', {
    status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }
  });
};

try {
  const request = new Request('https://statusgrid.pages.dev/api/check/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
    body: JSON.stringify({ urls: ['https://example.com/old', 'http://127.0.0.1/', 'https://www.google.com/', 'https://chatgpt.com/'] })
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
  assert.equal(results[2].status, 429);
  assert.equal(results[2].errorType, 'limited');
  assert.equal(results[2].hops.length, 2);
  assert.ok(results[2].issues.includes('Google limited automated check'));
  assert.equal(results[3].status, 403);
  assert.equal(results[3].errorType, 'limited');
  assert.ok(results[3].issues.includes('Access denied to checker'));
  assert.deepEqual(calls.map(call => call.url).sort(), [
    'https://example.com/old', 'https://example.com/new', 'https://www.google.com/',
    'https://www.google.com/sorry/index?continue=https://www.google.com/', 'https://chatgpt.com/'
  ].sort());
  assert.ok(calls.every(call => call.redirect === 'manual'));
  const methodResponse = await worker.fetch(new Request('https://statusgrid.pages.dev/api/check/'), env);
  assert.equal(methodResponse.status, 405);
  const assetResponse = await worker.fetch(new Request('https://statusgrid.pages.dev/'), env);
  assert.equal(await assetResponse.text(), 'static page');
  process.stdout.write('Cloudflare Worker smoke check passed.\n');
} finally {
  globalThis.fetch = originalFetch;
}
