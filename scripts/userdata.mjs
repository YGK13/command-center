// ============================================================
// USERDATA — bridges your dashboard edits into the morning email.
//
// The dashboard saves your edits with its Export button (the ↓ in the
// top bar) as a file named command-center-YYYY-MM-DD.json in your
// Downloads folder. This module finds the NEWEST such file and applies
// your edits (checked-off + added tasks, edited deals, health scores)
// on top of the defaults, so the morning brief reflects your real work.
//
// No server, no cloud. Your habit: edit in the dashboard, click Export,
// and tonight's email is current. Override the folder with USER_DATA_DIR.
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { ROOT } from './env.mjs'

const USER_DIR = process.env.USER_DATA_DIR || path.join(os.homedir(), 'Downloads')
const LOCAL = path.join(ROOT, 'data.local.json')

/**
 * Load your saved edits. Prefers data.local.json (written automatically
 * by the desktop app) and falls back to the newest command-center-*.json
 * export in Downloads (the manual Export-button path). Returns null if
 * neither exists.
 */
export function loadUserOverlay() {
  // 1. Desktop app's auto-saved state (no Export needed).
  try {
    if (fs.existsSync(LOCAL)) {
      const data = JSON.parse(fs.readFileSync(LOCAL, 'utf8'))
      return { ...data, _sourceFile: 'data.local.json' }
    }
  } catch {}

  // 2. Fallback: newest manual Export in Downloads.
  try {
    if (!fs.existsSync(USER_DIR)) return null
    const files = fs
      .readdirSync(USER_DIR)
      .filter((f) => /^command-center-.*\.json$/i.test(f))
      .map((f) => {
        const full = path.join(USER_DIR, f)
        return { full, f, mtime: fs.statSync(full).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)
    if (!files.length) return null
    const raw = fs.readFileSync(files[0].full, 'utf8')
    const data = JSON.parse(raw)
    return { ...data, _sourceFile: files[0].f, _mtime: files[0].mtime }
  } catch {
    return null
  }
}

// Merge saved task state (done-flags + user-added tasks) onto defaults.
function mergeTasks(defaults, savedTaskState) {
  if (!Array.isArray(savedTaskState)) return defaults
  const sm = Object.fromEntries(savedTaskState.map((t) => [t.id, t]))
  const merged = defaults.map((t) => (sm[t.id] ? { ...t, done: sm[t.id].done } : t))
  const ids = new Set(defaults.map((t) => t.id))
  const added = savedTaskState.filter((t) => !ids.has(t.id))
  return [...merged, ...added]
}

/**
 * Return a NEW snapshot with the user's overlay applied. Only the fields
 * the email uses are merged (tasks, deals, company health). The original
 * snapshot is left untouched, so data.js (the dashboard) is unaffected.
 */
export function applyOverlay(snapshot, overlay) {
  if (!overlay) return snapshot

  const tasks = mergeTasks(snapshot.tasks || [], overlay.tasks)
  const deals = Array.isArray(overlay.deals) ? overlay.deals : snapshot.deals

  const health = overlay.health && typeof overlay.health === 'object' ? overlay.health : {}
  const notes = overlay.notes && typeof overlay.notes === 'object' ? overlay.notes : {}
  const companies = (snapshot.companies || []).map((c) => ({
    ...c,
    health: health[c.id] != null ? health[c.id] : c.health,
    notes: notes[c.id] != null ? notes[c.id] : c.notes,
  }))

  return { ...snapshot, tasks, deals, companies }
}
