---
layout: ../../layouts/Article.astro
title: 'HTTP status codes and SEO: what actually matters'
description: 'A practical field guide to 2xx, 3xx, 4xx, and 5xx responses, with an audit workflow for finding and fixing the URLs that matter.'
category: Fundamentals
readingTime: 8 min read
date: 2026-10-13
---

An HTTP status code is the server's first answer to a request. It tells a browser or crawler whether it received a page, needs to go elsewhere, or encountered a problem. That makes status codes a useful starting point for an SEO audit—but never the whole diagnosis.

For example, a `200 OK` page can still contain an error message, a `noindex` directive, or a canonical pointing to another URL. And a `301` can lead through several more redirects before reaching a broken destination. The useful question is: **what happened from the requested URL all the way to the final page?**

## The five status code families

| Class | Meaning | Typical audit question |
| --- | --- | --- |
| 1xx | Informational | Usually handled within the connection, not a page-level SEO finding |
| 2xx | Request succeeded | Is the page useful, indexable, and canonical as intended? |
| 3xx | Further action or redirect | Does the destination resolve cleanly to the right page? |
| 4xx | Client-side request problem | Was the page removed intentionally, or is a link broken? |
| 5xx | Server-side failure | Is the problem temporary, widespread, or recurring? |

The [MDN HTTP status reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) defines each code's protocol meaning. Google's [crawler status-code guidance](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes) explains how its crawlers generally handle the common responses.

## 2xx: successful delivery is only the first check

`200 OK` means the server delivered a response successfully. It does **not** mean the page is indexed or will rank. Google says a 2xx page may be considered for processing, and its indexing pipeline makes further decisions. A page displaying “not found” while returning 200 can be treated as a **soft 404**.

For important 2xx pages, review the title, content, canonical URL, robots directives, and whether the page actually answers its intended query. StatusGrid reports the title, canonical, and robots signals it can find in the initial HTML and headers. Confirm rendering and index coverage in Search Console when those questions matter.

`204 No Content` is also a successful response, but it has no response body. It may be appropriate for an API action; it is rarely the response you want for a normal content page.

## 3xx: inspect the chain, not just the first hop

`301` and `308` communicate permanent moves; `302` and `307` indicate temporary ones. A redirect can be perfectly healthy when an old URL leads directly to the most relevant new page. It becomes a problem when it loops, leads to an error, crosses to an unexpected domain, or makes users and crawlers traverse a long chain.

Google treats redirects as a strong [canonicalization signal](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). A canonical link on the destination is another signal, and the two should express the same intent. For a site migration, map each old URL to its closest useful replacement and verify the final response.

## 4xx: distinguish intentional removals from mistakes

`404 Not Found` says the requested resource is absent. `410 Gone` says it has been removed and is expected to remain unavailable. Either can be correct for retired content with no suitable replacement. Redirecting every deleted page to the homepage usually creates a poor experience and may be interpreted as a soft 404.

A 404 on a key product page is different. Check internal links, navigation, XML sitemaps, campaign URLs, and external links you can update. If there is a genuinely equivalent new page, use a permanent redirect. If the content should still exist, restore it.

`401` and `403` can be intentional for private areas. On public pages, they can also signal accidental access restrictions. A checker may receive a 403 from bot protection even when visitors can load the page, so verify such cases in a browser and server logs.

## 5xx: investigate availability and scope

`500`, `502`, and `503` indicate server-side trouble. Google's crawler guidance says persistent 5xx responses can slow crawling and ultimately affect indexed URLs. A temporary 503 can be appropriate during maintenance; fix the cause and return 200 again as soon as the page is available.

Look for patterns: one URL, one path group, or the entire site? Compare checks across time, inspect application and edge logs, and test from more than one network if the problem is intermittent. A single remote check is evidence of a response at a moment in time, not an uptime measurement.

## A useful audit order

1. Start with URLs that bring traffic, receive internal links, or appear in your sitemap.
2. Check their **final** status and full redirect chain.
3. Triage 5xx and unexpected 4xx first; they can stop access to important pages.
4. Review redirects for wrong destinations, loops, and multiple hops.
5. On 2xx pages, compare canonical and robots signals with the intended indexable URL.
6. Recheck after fixes, then use Search Console for Google's own crawl and indexing view.

The [bulk checker](/#checker) makes steps 2–5 faster for a working list. It does not replace a full crawl, browser rendering, or Search Console.
