// ============================================================
// BUILDS — auto-discover your build folders from disk so the
// Command Center reflects everything you ship, with live status:
// last-modified, git branch, uncommitted changes, type, deploy.
// Re-scanned on every refresh, so new builds appear automatically.
//
// Scan root: BUILDS_DIR. Defaults to the parent folder of this project
// (i.e. it lists sibling project folders). Set BUILDS_DIR to point
// anywhere you keep your builds:
//   set BUILDS_DIR=C:\path\to\projects   (Windows)
//   export BUILDS_DIR=/path/to/projects  (Mac/Linux)
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BUILDS_DIR = process.env.BUILDS_DIR || path.resolve(ROOT, '..')

const HEAVY = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vercel', '.turbo', 'out', '.cache'])

function git(cwd, args) {
  try {
    return execSync('git ' + args, { cwd, stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).toString().trim()
  } catch {
    return ''
  }
}

function newestMtime(dir, depth) {
  let newest = 0
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return 0 }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.env') continue
    if (HEAVY.has(e.name)) continue
    const full = path.join(dir, e.name)
    try {
      const st = fs.statSync(full)
      if (st.mtimeMs > newest) newest = st.mtimeMs
      if (e.isDirectory() && depth > 0) {
        const sub = newestMtime(full, depth - 1)
        if (sub > newest) newest = sub
      }
    } catch {}
  }
  return newest
}

function readDesc(p) {
  try {
    const pj = path.join(p, 'package.json')
    if (fs.existsSync(pj)) {
      const j = JSON.parse(fs.readFileSync(pj, 'utf8'))
      if (j.description) return String(j.description).slice(0, 160)
    }
  } catch {}
  for (const name of ['README.md', 'readme.md', 'README.txt']) {
    const rp = path.join(p, name)
    if (fs.existsSync(rp)) {
      try {
        const lines = fs.readFileSync(rp, 'utf8').split(/\r?\n/)
        for (let l of lines) {
          l = l.replace(/^#+\s*/, '').trim()
          if (l && !l.startsWith('![') && l.length > 3) return l.slice(0, 160)
        }
      } catch {}
    }
  }
  return ''
}

function detectType(p) {
  const pj = path.join(p, 'package.json')
  if (fs.existsSync(pj)) {
    try {
      const j = JSON.parse(fs.readFileSync(pj, 'utf8'))
      const deps = Object.assign({}, j.dependencies, j.devDependencies)
      if (deps.next) return 'Next.js'
      if (deps.express || deps.fastify || deps.koa) return 'Node API'
      if (deps.react || deps['react-dom']) return 'React'
      if (deps.vite) return 'Vite'
      return 'Node'
    } catch { return 'Node' }
  }
  if (fs.existsSync(path.join(p, 'requirements.txt')) || fs.existsSync(path.join(p, 'pyproject.toml'))) return 'Python'
  if (fs.existsSync(path.join(p, 'index.html'))) return 'Static HTML'
  return 'Folder'
}

function isCandidate(p) {
  return (
    fs.existsSync(path.join(p, 'package.json')) ||
    fs.existsSync(path.join(p, '.git')) ||
    fs.existsSync(path.join(p, 'index.html')) ||
    fs.existsSync(path.join(p, 'requirements.txt'))
  )
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function statusOf(ageDays) {
  if (ageDays <= 7) return 'active'
  if (ageDays <= 30) return 'recent'
  return 'stale'
}

/**
 * Discover all build folders under BUILDS_DIR, sorted newest-first.
 * Never throws; returns [] on failure.
 */
export function discoverBuilds({ max = 40 } = {}) {
  try {
    if (!fs.existsSync(BUILDS_DIR)) return []
    const now = Date.now()
    const dirs = fs.readdirSync(BUILDS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .filter((e) => !e.name.startsWith('.') && !HEAVY.has(e.name))
      .filter((e) => !/^archived/i.test(e.name))

    const builds = []
    for (const e of dirs) {
      const p = path.join(BUILDS_DIR, e.name)
      if (!isCandidate(p)) continue

      const isGit = fs.existsSync(path.join(p, '.git'))
      let branch = '', dirty = 0, lastCommitISO = ''
      if (isGit) {
        branch = git(p, 'rev-parse --abbrev-ref HEAD')
        const porc = git(p, 'status --porcelain')
        dirty = porc ? porc.split(/\r?\n/).filter(Boolean).length : 0
        lastCommitISO = git(p, 'log -1 --format=%cI')
      }

      const mtime = newestMtime(p, 2)
      const commitMs = lastCommitISO ? Date.parse(lastCommitISO) : 0
      const lastMs = Math.max(mtime, commitMs)
      const ageDays = lastMs ? Math.floor((now - lastMs) / 86400000) : 9999

      builds.push({
        id: slug(e.name),
        name: e.name,
        type: detectType(p),
        desc: readDesc(p),
        git: isGit ? { branch: branch || '(detached)', dirty } : null,
        deploy: fs.existsSync(path.join(p, 'vercel.json')) || fs.existsSync(path.join(p, '.vercel')),
        lastModifiedISO: lastMs ? new Date(lastMs).toISOString() : null,
        ageDays,
        status: statusOf(ageDays),
      })
    }

    builds.sort((a, b) => a.ageDays - b.ageDays)
    return builds.slice(0, max)
  } catch (err) {
    console.error('[builds] discover failed:', err.message)
    return []
  }
}
