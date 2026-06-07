// ============================================================
// DIGEST — reads the newest note from your notes folder, if you keep one.
// Optional. If the folder does not exist, it returns null and
// everything else still works. Point DIGEST_DIR at your own folder
// of dated Markdown notes (files named like 2026-06-09.md).
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Default: a `notes/` folder inside the project. Change to any absolute
// path you like, e.g. 'C:\\Users\\you\\notes' or '/home/you/notes'.
const DIGEST_DIR = path.join(ROOT, 'notes')

export function readLatestDigest() {
  try {
    if (!fs.existsSync(DIGEST_DIR)) return null
    const files = fs
      .readdirSync(DIGEST_DIR)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse()
    if (!files.length) return null
    const latest = files[0]
    return {
      content: fs.readFileSync(path.join(DIGEST_DIR, latest), 'utf8'),
      filename: latest,
      date: latest.replace('.md', ''),
      recent: files.slice(0, 7).map((f) => ({ filename: f, date: f.replace('.md', '') })),
    }
  } catch {
    return null
  }
}
