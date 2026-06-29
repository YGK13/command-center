// ============================================================
// KB (optional) — if you keep a folder of daily markdown digests of
// your business activity, this surfaces the recent items as a live
// "Business Activity" feed in the dashboard and the morning brief.
//
// Point KB_DIR at a folder that contains a `daily-digests/` subfolder
// of files named YYYY-MM-DD.md. If you do not keep one, this returns
// nothing and everything else works normally.
//
//   set KB_DIR=C:\path\to\knowledge-base   (Windows)
//   export KB_DIR=/path/to/knowledge-base  (Mac/Linux)
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KB_DIR = process.env.KB_DIR || path.join(ROOT, 'knowledge-base')
const DIGESTS = path.join(KB_DIR, 'daily-digests')

// Pull the text of a "## Section Name" block until the next "## ".
function section(md, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('##\\s+' + esc + '[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)', 'i')
  const m = md.match(re)
  return m ? m[1] : ''
}

/**
 * Read the most recent digests and return feed items:
 *   { title, pubDate, source, kind }
 * "Deal / donor signals" callouts come first, then "What came in" events.
 */
export function readKBActivity({ maxDigests = 6, maxItems = 30 } = {}) {
  try {
    if (!fs.existsSync(DIGESTS)) return { items: [], error: 'knowledge base not found' }
    const files = fs
      .readdirSync(DIGESTS)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse()
      .slice(0, maxDigests)

    const signals = []
    const events = []

    for (const f of files) {
      const date = f.replace('.md', '')
      const md = fs.readFileSync(path.join(DIGESTS, f), 'utf8')

      const sig = section(md, 'Deal / donor signals')
      ;(sig.match(/\*\*(.+?)\*\*/g) || []).forEach((s) => {
        const title = s.replace(/\*\*/g, '').trim()
        if (title) signals.push({ title: title.slice(0, 220), pubDate: date, source: 'Signal', kind: 'signal' })
      })

      const came = section(md, 'What came in')
      came.split(/\r?\n/).filter((l) => l.trim().startsWith('- ')).forEach((l) => {
        let text = l.replace(/^\s*-\s*/, '')
        text = text.replace(/\[[^\]]*\]\([^)]*\)/g, '')
        text = text.replace(/^[\s—–-]+/, '').trim()
        if (text) events.push({ title: text.slice(0, 220), pubDate: date, source: 'Activity', kind: 'activity' })
      })
    }

    const items = [...signals, ...events].slice(0, maxItems)
    return { items, error: items.length ? null : 'no recent activity' }
  } catch (e) {
    return { items: [], error: e.message }
  }
}

/**
 * Open action items from the latest digest, for the morning brief.
 */
export function readKBActions({ max = 6 } = {}) {
  try {
    if (!fs.existsSync(DIGESTS)) return []
    const files = fs.readdirSync(DIGESTS).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().reverse()
    if (!files.length) return []
    const md = fs.readFileSync(path.join(DIGESTS, files[0]), 'utf8')
    const sec = section(md, 'Action items surfaced')
    return sec
      .split(/\r?\n/)
      .filter((l) => /^\s*-\s*\[\s*\]/.test(l))
      .map((l) => l.replace(/^\s*-\s*\[\s*\]\s*/, '').replace(/\[source:[^\]]*\]/gi, '').trim())
      .filter(Boolean)
      .slice(0, max)
  } catch {
    return []
  }
}
