import type { APIRoute } from 'astro';

const paths = [
  '/', '/status-codes/', '/blog/', '/how-it-works/', '/about/', '/privacy/',
  '/blog/http-status-codes-seo/', '/blog/301-vs-302-redirects/',
  '/blog/404-vs-410-soft-404/', '/blog/503-vs-429/', '/blog/ai-search-crawlability/'
];

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://example.com');
  const items = paths.map(path => `<url><loc>${new URL(path, origin).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
