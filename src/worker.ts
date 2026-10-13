import { onRequestPost } from '../functions/api/check';

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

// Cloudflare Workers and Pages use this bundled file as dist/_worker.js.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (path === '/api/check') {
      if (request.method === 'POST') return onRequestPost({ request });
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
    }
    if (path.startsWith('/api/')) return Response.json({ error: 'Unknown API route' }, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
