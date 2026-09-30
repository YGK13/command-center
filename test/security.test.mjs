// Security regression tests: localhost request guard, feed-link filtering,
// email HTML escaping, and relative sample dates. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeRequestGuard } from '../scripts/guard.mjs'
import { parseRSS } from '../scripts/feeds.mjs'
import { composeBrief } from '../scripts/brief.mjs'
import { COMPANIES, PIPELINE_DEALS_DEFAULT, TASKS_DEFAULT, STAGES } from '../scripts/data.mjs'

const check = makeRequestGuard(4173)
const json = { 'content-type': 'application/json' }

test('guard: same-origin dashboard requests pass', () => {
  assert.equal(check({ method: 'GET', headers: { host: 'localhost:4173' } }), null)
  assert.equal(check({ method: 'POST', headers: { host: '127.0.0.1:4173', origin: 'http://127.0.0.1:4173', 'sec-fetch-site': 'same-origin', ...json } }), null)
})

test('guard: DNS-rebinding Host is rejected', () => {
  assert.equal(check({ method: 'GET', headers: { host: 'evil.example:4173' } }), 'bad host')
  assert.equal(check({ method: 'GET', headers: {} }), 'bad host')
})

test('guard: cross-site writes are rejected', () => {
  assert.equal(check({ method: 'POST', headers: { host: 'localhost:4173', origin: 'https://evil.example', ...json } }), 'bad origin')
  assert.equal(check({ method: 'POST', headers: { host: 'localhost:4173', 'sec-fetch-site': 'cross-site', ...json } }), 'cross-site')
  assert.equal(check({ method: 'POST', headers: { host: 'localhost:4173', ...json } }), 'origin required')
  assert.equal(check({ method: 'POST', headers: { host: 'localhost:4173', origin: 'http://localhost:4173', 'content-type': 'text/plain' } }), 'json required')
})

test('feeds: non-http(s) links are dropped', () => {
  const xml = `<rss><channel>
    <item><title>ok</title><link>https://example.com/a</link></item>
    <item><title>bad</title><link>javascript:alert(1)</link></item>
    <item><title>bad2</title><link> data:text/html,x</link></item>
  </channel></rss>`
  const items = parseRSS(xml)
  assert.deepEqual(items.map((i) => i.title), ['ok'])
})

test('brief: quotes in links cannot break out of the href attribute', () => {
  const snapshot = {
    generatedAt: new Date().toISOString(),
    companies: COMPANIES, tasks: TASKS_DEFAULT, deals: PIPELINE_DEALS_DEFAULT, okrs: [], stages: STAGES, builds: [],
    feeds: { 'ai-hr': { label: 'AI', color: '#000', items: [
      { title: 'x', link: 'https://e.com/"onmouseover="alert(1)' },
      { title: 'y', link: 'javascript:alert(1)' },
    ] } },
  }
  const { html } = composeBrief(snapshot, { now: new Date(2026, 8, 24, 7), dashboardPath: '/tmp/index.html' })
  assert.ok(!html.includes('"onmouseover="'))
  assert.ok(html.includes('&quot;onmouseover=&quot;'))
  assert.ok(!html.includes('javascript:alert'))
})

test('sample data: due dates are relative to today, not stale', () => {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  assert.ok(TASKS_DEFAULT.every((t) => t.dueISO >= today))
  assert.ok(TASKS_DEFAULT.some((t) => t.dueISO === today && t.dueDate === 'Today'))
})
