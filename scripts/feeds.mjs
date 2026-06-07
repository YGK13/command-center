// ============================================================
// FEEDS — server-side RSS/Atom fetch + parse (Node, no deps)
// Runs in the morning engine. Because this is Node (not a browser),
// there is no CORS restriction — we can fetch any feed directly.
// ============================================================

// ---- XML helpers ---------------------------------------------

function extractTag(str, tag) {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`,
    'i'
  )
  const m = str.match(re)
  if (!m) return ''
  return (m[1] ?? m[2] ?? '').trim()
}

function extractAttr(str, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["']`, 'i')
  const m = str.match(re)
  return m ? m[1] : ''
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function parseRSS(xml, limit = 12) {
  const items = []
  const blockRe = /<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/g
  let match

  while ((match = blockRe.exec(xml)) !== null && items.length < limit) {
    const block = match[1]

    const linkTag  = extractTag(block, 'link')
    const linkHref = extractAttr(block, 'link', 'href')
    const link     = linkHref || linkTag

    const pubDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated') ||
      ''

    const rawDesc =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content') ||
      ''
    const description = decodeEntities(rawDesc.replace(/<[^>]+>/g, '')).trim().slice(0, 220)

    const title  = decodeEntities(extractTag(block, 'title'))
    const source = decodeEntities(extractTag(block, 'source'))

    if (title && link) {
      items.push({ title, link, pubDate, description, source })
    }
  }
  return items
}

// ---- Public API ----------------------------------------------

/**
 * Fetch and parse a single feed. Returns { items, error }.
 * Never throws — failures are returned as { items: [], error }.
 */
export async function fetchFeed(url, { limit = 12, timeoutMs = 12000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    })
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` }
    const xml = await res.text()
    return { items: parseRSS(xml, limit), error: null }
  } catch (err) {
    return { items: [], error: err.name === 'AbortError' ? 'timeout' : err.message }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch all feed sources in parallel.
 * Returns an object keyed by source id: { [id]: { label, color, items, error, fetchedAt } }
 */
export async function fetchAllFeeds(sources) {
  const entries = await Promise.all(
    sources.map(async (s) => {
      const { items, error } = await fetchFeed(s.url, { limit: 12 })
      return [
        s.id,
        {
          id: s.id,
          label: s.label,
          color: s.color,
          description: s.description,
          items,
          error,
          fetchedAt: new Date().toISOString(),
        },
      ]
    })
  )
  return Object.fromEntries(entries)
}
