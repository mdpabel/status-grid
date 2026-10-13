export type Hop = { url: string; status: number; location: string | null; ms: number };
export type CheckResult = {
  input: string;
  finalUrl: string | null;
  status: number | null;
  statusText: string;
  ms: number;
  hops: Hop[];
  contentType: string | null;
  canonical: string | null;
  robots: string | null;
  title: string | null;
  issues: string[];
  error: string | null;
  errorType: 'blocked' | 'limited' | 'network' | 'redirect' | 'input' | null;
};

const statusNames: Record<number, string> = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 303: 'See Other',
  304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 408: 'Request Timeout',
  410: 'Gone', 418: "I'm a Teapot", 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
  504: 'Gateway Timeout'
};

function safeUrl(raw: string, ownHostname: string): URL {
  if (raw.length > 2048) throw new Error('URL is too long');
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Invalid URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported');
  if (url.username || url.password) throw new Error('URLs with credentials are not supported');
  if (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) throw new Error('Only standard HTTP and HTTPS ports are supported');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || /^\[.*\]$/.test(host) || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)
    || /(^|\.)(?:localhost|local|internal|invalid|test)$/.test(host)) {
    throw new Error('Local destinations and IP addresses are not allowed');
  }
  if (host === ownHostname.toLowerCase().replace(/\.$/, '')) throw new Error('Checker cannot request itself');
  url.hash = '';
  return url;
}

type ResponseData = {
  status: number; statusText: string; location: string | null; contentType: string | null;
  xRobots: string | null; link: string | null; body: string; ms: number;
};

async function requestOnce(url: URL): Promise<ResponseData> {
  const start = performance.now();
  const response = await fetch(url.href, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
    headers: {
      'user-agent': 'StatusGrid/1.0 (+public HTTP status checker)',
      'accept': 'text/html,application/xhtml+xml,*/*;q=0.8'
    }
  });
  const contentType = response.headers.get('content-type');
  let body = '';
  if (response.status >= 300 && response.status < 400 || !contentType?.toLowerCase().includes('html')) {
    await response.body?.cancel();
  } else if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    while (bytes < 131072) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const take = chunk.value.subarray(0, 131072 - bytes);
      body += decoder.decode(take, { stream: true });
      bytes += take.byteLength;
      if (bytes >= 131072) await reader.cancel();
    }
    body += decoder.decode();
  }
  return {
    status: response.status,
    statusText: statusNames[response.status] || response.statusText,
    location: response.headers.get('location'),
    contentType,
    xRobots: response.headers.get('x-robots-tag'),
    link: response.headers.get('link'),
    body,
    ms: Math.round(performance.now() - start)
  };
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return out;
}

function htmlSignals(body: string, finalUrl: string, linkHeader: string | null) {
  let canonical: string | null = null;
  let robots: string | null = null;
  let title: string | null = null;
  for (const tag of body.match(/<(?:meta|link)\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (!canonical && /\bcanonical\b/i.test(attrs.rel ?? '') && attrs.href) {
      try { canonical = new URL(attrs.href, finalUrl).href; } catch { /* invalid page signal */ }
    }
    if (!robots && ['robots', 'googlebot'].includes((attrs.name ?? '').toLowerCase())) robots = attrs.content ?? null;
  }
  if (!canonical && linkHeader) {
    const match = linkHeader.match(/<([^>]+)>\s*;[^,]*rel\s*=\s*"?canonical"?/i);
    if (match) { try { canonical = new URL(match[1], finalUrl).href; } catch { /* invalid header */ } }
  }
  const titleMatch = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 160);
  return { canonical, robots, title };
}

export async function checkUrl(input: string, ownHostname: string): Promise<CheckResult> {
  const result: CheckResult = {
    input, finalUrl: null, status: null, statusText: '', ms: 0, hops: [], contentType: null,
    canonical: null, robots: null, title: null, issues: [], error: null, errorType: null
  };
  try {
    let current = safeUrl(input, ownHostname);
    const visited = new Set<string>();
    for (let index = 0; index <= 6; index++) {
      if (visited.has(current.href)) throw new Error('Redirect loop detected');
      visited.add(current.href);
      const response = await requestOnce(current);
      result.ms += response.ms;
      result.hops.push({ url: current.href, status: response.status, location: response.location, ms: response.ms });
      result.status = response.status;
      result.statusText = response.statusText;
      result.finalUrl = current.href;
      result.contentType = response.contentType;
      result.robots = response.xRobots;
      if (response.status >= 300 && response.status < 400 && response.location) {
        if (index === 6) throw new Error('More than 6 redirects');
        current = safeUrl(new URL(response.location, current).href, ownHostname);
        continue;
      }
      const signals = htmlSignals(response.body, current.href, response.link);
      result.canonical = signals.canonical;
      result.title = signals.title;
      result.robots = [response.xRobots, signals.robots].filter(Boolean).join('; ') || null;
      break;
    }
    const final = result.finalUrl ? new URL(result.finalUrl) : null;
    const googleChallenge = !!final && /(^|\.)google\.com$/i.test(final.hostname) && final.pathname.startsWith('/sorry/');
    if (googleChallenge || result.status === 429 || result.status === 403) {
      result.errorType = 'limited';
      result.error = googleChallenge
        ? 'Google redirected this automated request to its unusual-traffic page. This does not show that the requested page is unavailable to visitors.'
        : result.status === 429
          ? 'The destination rate limited this checker request. Its response to visitors may differ.'
          : 'The destination refused this checker request with 403. An access rule, login requirement, or automated-request filter may be involved; check in a browser.';
      result.issues.push(googleChallenge ? 'Google limited automated check' : result.status === 429 ? 'Request rate limited' : 'Access denied to checker');
    } else if (result.status && result.status >= 500) result.issues.push('Server error');
    else if (result.status && result.status >= 400) result.issues.push('Client error');
    else if (result.status && result.status >= 300 && result.status < 400) result.issues.push('Unresolved redirect');
    if (result.hops.length > 3) result.issues.push('Long redirect chain');
    if (result.finalUrl?.startsWith('http:')) result.issues.push('Final URL uses HTTP');
    if (result.robots && /(?:^|[,;\s])noindex(?:$|[,;\s])/i.test(result.robots)) result.issues.push('Noindex directive');
    if (result.canonical && result.finalUrl && result.canonical !== result.finalUrl) result.issues.push('Canonical differs');
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Check failed';
    if (/Redirect loop detected|More than 6 redirects/.test(detail)) {
      result.errorType = 'redirect';
      result.error = detail;
      result.issues.push(detail.startsWith('Redirect loop') ? 'Redirect loop' : 'Too many redirects');
    } else if (/Only HTTP|Only standard|URLs with credentials|URL is too long|Local destinations|Checker cannot request itself|Invalid URL/.test(detail)) {
      result.errorType = 'input';
      result.error = detail;
      result.issues.push('Invalid URL');
    } else {
      result.errorType = 'network';
      result.error = detail;
      result.issues.push('Could not verify');
    }
  }
  return result;
}
