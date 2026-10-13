---
layout: ../../layouts/Article.astro
title: '301 vs 302 redirects: choosing the right move'
description: 'Understand permanent and temporary redirects, check their final destinations, and avoid common migration mistakes.'
category: Redirects
readingTime: 6 min read
date: 2026-10-13
---

A redirect is a promise about where a URL now leads. The code tells clients whether that move is intended to last. The destination determines whether the promise is useful.

## The practical difference

Use a **301 Moved Permanently** when the old URL has a lasting replacement. Use a **302 Found** when the change is temporary and the original URL is expected to return. The related `308` and `307` codes preserve the request method across the redirect; this distinction matters especially for non-GET requests. See [MDN's status definitions](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) for protocol details.

Examples:

| Situation | Common choice | Why |
| --- | --- | --- |
| A renamed article has a new permanent URL | 301 | The old address should point to the new article |
| A product is briefly unavailable and has a temporary alternate page | 302 | The original product page is expected back |
| HTTP is being consolidated to HTTPS | 301 or 308 | The secure address is the lasting destination |
| A short-lived experiment sends users to a variant | 302 or 307 | The original URL remains the primary address |

Google's [canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) describes redirects as a strong signal about the preferred URL. It also notes that search systems can consider multiple signals. A redirect code alone does not guarantee a particular search result.

## Check the entire route

This route reaches a working page, but it wastes a hop:

`/old` → **301** `/intermediate` → **302** `/new` → **200**

If `/new` is the intended permanent replacement, update `/old` to redirect straight there and update internal links to point to `/new`. The goal is a clear, stable route for people and crawlers.

Other issues to look for:

- **Loop:** A sends to B, and B sends back to A.
- **Wrong target:** The final page is unrelated to the old content.
- **Broken target:** The final URL returns 404 or 5xx.
- **Domain surprise:** A migration rule sends users to an unintended hostname.
- **Signal conflict:** The final page's canonical points elsewhere unexpectedly.

## Migration checklist

Build a two-column map of old and intended new URLs before changing rules. For each source URL, verify the first redirect response, each intermediate hop, final status, and final canonical. Test representative pages from every template and URL pattern, then check high-value URLs individually.

Keep redirects in place long enough for users and search engines to encounter them. Update internal navigation, canonical links, and XML sitemaps to the final URLs rather than relying on redirects as your permanent internal architecture.

You can [paste your redirect map's source URLs into StatusGrid](/#checker) and export the observed paths. Compare the final URL column with your planned destinations.
