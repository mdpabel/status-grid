# StatusGrid

An Astro site with a Cloudflare Worker API for bulk HTTP status and redirect checks, migration map comparison, an HTTP status reference, and practical SEO articles.

## Deploy to the existing Cloudflare Worker

The live site at `https://statusgrid.mdpabel.com` is a Cloudflare Worker named `status-grid`, connected to the `mdpabel/status-grid` GitHub repository. `wrangler.jsonc` deploys the static `dist` assets and runs the Worker for `/api/*`. `npm run build` creates both the Astro pages and `dist/_worker.js`, which handles `POST /api/check/`.

In **Workers & Pages → status-grid → Settings → Builds**, use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

Push this source to the connected repository. The Worker name in `wrangler.jsonc` matches the existing service, so its custom domain stays attached. The build defaults canonical and sitemap URLs to `https://statusgrid.mdpabel.com`; set `SITE_URL` at build time only if moving to a different domain.

**Verify the deployment:** Open `https://statusgrid.mdpabel.com/api/check/` in a browser. A working Worker returns JSON with HTTP 405 and `Method not allowed` for a GET request. An HTML 404 page means the Worker API was not deployed. Then check a known public URL such as `https://www.mdpabel.com/` in the main tool. A local build cannot prove that Cloudflare's outbound fetch works for a particular destination.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` builds the site and runs `wrangler dev` with the same Worker and asset configuration. Wrangler is fetched by `npx` if it is not installed. Use `npm run dev:content` only while editing static Astro pages; its checker API is unavailable. `npm run preview` starts Wrangler against an existing build.

Cloudflare Pages remains possible: `dist/_worker.js` is also a Pages advanced-mode Worker, and `dist/_routes.json` limits its invocations to `/api/*`. Pages deployment is separate from the existing `status-grid` Worker service.

## Checker limits

The browser accepts up to 50 HTTP(S) URLs and sends them in batches of five. Each URL follows at most six redirects, uses an eight-second timeout per hop, and reads at most 128 KB of final HTML. The Worker rejects IP literals, local hostnames, nonstandard ports, and redirects to them. Cloudflare's outbound `fetch()` rules also apply. A failed fetch means the checker could not verify that URL; it does not prove the website is offline.

The in-memory limit of 60 URLs per minute per IP is a best-effort guard within a Worker instance. Configure Cloudflare rate limiting if a strict global limit is needed. Five URLs per request stay within the Cloudflare Workers Free plan's 50 external subrequests per invocation even if each follows six redirects.

The checker reports HTTP responses and selected HTML/header signals. It does not emulate a browser, crawl an entire site, or determine Google index coverage. Some sites block automated requests, and results can differ by location, user agent, authentication, or time.
