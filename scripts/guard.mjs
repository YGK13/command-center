// ============================================================
// GUARD — request checks for the localhost app server (serve.mjs).
// Binding to 127.0.0.1 keeps the network out, but any web page you visit
// can still send requests to localhost (CSRF), and a DNS-rebinding site can
// even read the responses. So: the Host header must be this server, and
// state-changing requests must come from this origin as JSON.
// ============================================================

export function makeRequestGuard(port) {
  const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`])
  const origins = new Set([...hosts].map((h) => `http://${h}`))

  /** Returns null when the request is allowed, else a short reason. */
  return function checkRequest({ method, headers }) {
    const host = String(headers.host || '').toLowerCase()
    if (!hosts.has(host)) return 'bad host'
    const origin = headers.origin
    // Browsers send Origin on cross-origin requests and on every POST.
    if (origin && !origins.has(String(origin).toLowerCase())) return 'bad origin'
    const site = headers['sec-fetch-site']
    if (site && site !== 'same-origin' && site !== 'none') return 'cross-site'
    if (method !== 'GET' && method !== 'HEAD') {
      if (!origin) return 'origin required'
      const type = String(headers['content-type'] || '').split(';')[0].trim().toLowerCase()
      if (type !== 'application/json') return 'json required'
    }
    return null
  }
}
