import { checkUrl } from '../lib/checker';

// Shared API handler, bundled into the Cloudflare Worker entry point.
type Context = { request: Request };
const limits = new Map<string, { count: number; reset: number }>();

export async function onRequestPost({ request }: Context): Promise<Response> {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return Response.json({ error: 'Request body is too large' }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const urls = (body as { urls?: unknown })?.urls;
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > 5 || urls.some(url => typeof url !== 'string' || url.length > 2048)) {
    return Response.json({ error: 'Send 1 to 5 URL strings per request' }, { status: 400 });
  }
  const now = Date.now();
  if (limits.size > 10000) for (const [key, value] of limits) if (value.reset < now) limits.delete(key);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const entry = limits.get(ip);
  const limit = entry && entry.reset > now ? entry : { count: 0, reset: now + 60_000 };
  if (limit.count + urls.length > 60) {
    return Response.json({ error: 'Rate limit reached. Try again in a minute.' }, {
      status: 429, headers: { 'Retry-After': String(Math.ceil((limit.reset - now) / 1000)) }
    });
  }
  limit.count += urls.length;
  limits.set(ip, limit);
  const ownHostname = new URL(request.url).hostname;
  const results = await Promise.all(urls.map(url => checkUrl(url, ownHostname)));
  return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
}
