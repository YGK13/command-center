// ============================================================
// SERVE — the desktop app server (localhost only, zero deps).
// Serves the dashboard at http://localhost:4173 and persists your
// edits to data.local.json on disk, so the morning email reads your
// live state with NO export step. Bound to 127.0.0.1 only, so it is
// never reachable from the network.
//
//   node scripts/serve.mjs     (or double-click "Command Center.bat")
// ============================================================

import './env.mjs'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './env.mjs'

const PORT = Number(process.env.CC_PORT) || 4173
const STATE = path.join(ROOT, 'data.local.json')

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0]

  // The dashboard
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    try { return send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(path.join(ROOT, 'index.html'))) }
    catch { return send(res, 500, 'text/plain', 'index.html not found') }
  }

  // The generated data snapshot
  if (req.method === 'GET' && url === '/data.js') {
    const p = path.join(ROOT, 'data.js')
    if (fs.existsSync(p)) return send(res, 200, 'application/javascript', fs.readFileSync(p))
    return send(res, 200, 'application/javascript', 'window.__CC__=null;')
  }

  // Read your saved edits
  if (req.method === 'GET' && url === '/state') {
    let data = '{}'
    try { if (fs.existsSync(STATE)) data = fs.readFileSync(STATE, 'utf8') } catch {}
    return send(res, 200, 'application/json', data)
  }

  // Save your edits (the dashboard POSTs here on every change)
  if (req.method === 'POST' && url === '/state') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 5_000_000) req.destroy() })
    req.on('end', () => {
      try {
        JSON.parse(body)                       // validate
        fs.writeFileSync(STATE, body, 'utf8')
        send(res, 200, 'application/json', '{"ok":true}')
      } catch {
        send(res, 400, 'application/json', '{"ok":false}')
      }
    })
    return
  }

  send(res, 404, 'text/plain', 'not found')
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('⚡ Command Center running → http://localhost:' + PORT)
  console.log('   Your edits auto-save to data.local.json. Close this window to stop.')
})
