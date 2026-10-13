# StatusGrid

An Astro site for Cloudflare Pages, with a Pages Function for bulk HTTP status and redirect checks, migration map comparison, an HTTP status reference, and practical SEO articles.

## Cloudflare Pages deployment

Connect this repository to a Cloudflare Pages project. Use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `SITE_URL=https://your-public-domain` |

The Astro pages are static. `functions/api/check.ts` handles `POST /api/check/` in the Cloudflare Workers runtime. The `public/_routes.json` file keeps the static pages out of Function invocations. Deploy through Pages Git integration or Wrangler; dashboard Direct Upload does not include Functions. Set `SITE_URL` before the build so canonical links and the sitemap use your real domain.

After deployment, check a known public URL such as `https://www.mdpabel.com/` and confirm that the table reports the response code. A local build cannot prove that Cloudflare's outbound fetch works for a particular destination.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` builds the static site and starts `wrangler pages dev dist` so the Pages Function runs locally. Wrangler is fetched by `npx` if it is not installed. Use `npm run dev:content` only while editing static Astro pages; its checker API is unavailable. `npm run preview` starts Wrangler against an existing build.

## Checker limits

The browser accepts up to 50 HTTP(S) URLs and sends them in batches of five. Each URL follows at most six redirects, uses an eight-second timeout per hop, and reads at most 128 KB of final HTML. The Function rejects IP literals, local hostnames, nonstandard ports, and redirects to them. Cloudflare's outbound `fetch()` rules also apply. A failed fetch means the checker could not verify that URL; it does not prove the website is offline.

The in-memory limit of 60 URLs per minute per IP is a best-effort guard within a Function instance. Configure Cloudflare rate limiting if a strict global limit is needed. Five URLs per request stay within the Cloudflare Workers Free plan's 50 external subrequests per invocation even if each follows six redirects.

The checker reports HTTP responses and selected HTML/header signals. It does not emulate a browser, crawl an entire site, or determine Google index coverage. Some sites block automated requests, and results can differ by location, user agent, authentication, or time.
