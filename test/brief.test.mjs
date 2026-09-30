// Morning brief behavior: business-lines scoreboard, headlines from the
// configured feeds, configurable rest days, dashboard link, overlay merge.
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composeBrief, businessLines, pickHeadlines, parseRestDays, isRestDay } from '../scripts/brief.mjs'
import { applyOverlay } from '../scripts/userdata.mjs'

const WED = new Date(2026, 8, 30, 7) // Wed Sep 30 2026
const TODAY = '2026-09-30'

const companies = [
  { id: 'a', name: 'Alpha', color: '#111', health: 80, focusAction: 'Keep going', revenueLabel: 'MRR', revenueCurrent: 5000, revenueTarget: 10000 },
  { id: 'b', name: 'Beta', color: '#222', health: 40, focusAction: 'Fix onboarding', revenueLabel: 'Subscribers', revenueCurrent: 100, revenueTarget: 0 },
  { id: 'c', name: 'Gamma', color: '#333', health: 90, focusAction: 'Hold' },
]
const tasks = [
  { id: 't1', company: 'a', priority: 'high', title: 'Late task', category: 'Sales', done: false, dueISO: '2026-09-28' },
  { id: 't2', company: 'a', priority: 'medium', title: 'Today task', category: 'Sales', done: false, dueISO: TODAY },
  { id: 't3', company: 'b', priority: 'critical', title: 'Beta task', category: 'Build', done: false, dueISO: '2026-10-05' },
  { id: 't4', company: 'c', priority: 'low', title: 'Done task', category: 'Ops', done: true, dueISO: '2026-09-01' },
]
const deals = [
  { id: 'd1', company: 'a', name: 'Big deal', value: 50000, stage: 'proposal', nextAction: 'Send it', dueDate: '2026-10-03' },
  { id: 'd2', company: 'a', name: 'Late deal', value: 10000, stage: 'warm', nextAction: 'Chase', dueDate: '2026-09-29' },
  { id: 'd3', company: 'a', name: 'Won deal', value: 99000, stage: 'closed', nextAction: '-', dueDate: '2026-09-30' },
]
const snap = (extra = {}) => ({
  generatedAt: WED.toISOString(), companies, tasks, deals, okrs: [], stages: [], builds: [], feeds: {}, ...extra,
})

test('business lines: counts, pipeline, next deal and ordering', () => {
  const open = tasks.filter((t) => !t.done)
  const lines = businessLines(snap(), open, TODAY)
  assert.deepEqual(lines.map((l) => l.id), ['a', 'b', 'c']) // overdue first, then lowest health
  const a = lines[0]
  assert.equal(a.open, 2)
  assert.equal(a.overdue, 1)
  assert.equal(a.dueToday, 1)
  assert.equal(a.pipeline, 60000) // closed deal excluded
  assert.equal(a.dealCount, 2)
  assert.equal(a.nextDeal.name, 'Late deal')
  assert.equal(a.nextDeal.inDays, -1)
  assert.equal(a.progress, 50)
  assert.equal(a.status, 'red')
  assert.equal(lines[1].progress, null) // no target -> no progress figure
  assert.equal(lines[1].status, 'red') // health < 50
  assert.equal(lines[2].status, 'green')
  assert.equal(lines[2].open, 0)
})

test('brief: every business line appears in both HTML and text', () => {
  const b = composeBrief(snap(), { now: WED, restDays: [6] })
  assert.equal(b.skip, false)
  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    assert.ok(b.html.includes(name), name + ' in html')
    assert.ok(b.text.includes(name), name + ' in text')
  }
  assert.match(b.text, /BUSINESS LINES AT A GLANCE/)
  assert.match(b.text, /\[RED\] Alpha \(H80\): 2 open · 1 overdue · 1 due today · \$60K pipeline \(2\) · 50% of MRR target/)
  assert.match(b.text, /next deal: Late deal \(1d late\)/)
  assert.ok(!b.text.includes('focus: Hold')) // green lines stay quiet
  assert.match(b.text, /focus: Fix onboarding/)
})

test('headlines: come from the configured feeds in FEED_SOURCES order', () => {
  const item = (t) => ({ title: t, link: 'https://example.com/' + t })
  const s = snap({
    feedSources: [{ id: 'business' }, { id: 'industry' }, { id: 'ai' }, { id: 'tech' }, { id: 'extra' }],
    feeds: {
      business: { label: 'Biz', items: [item('kb')] },
      tech: { label: 'Tech', color: '#0f0', items: [item('t1'), item('t2')] },
      industry: { label: 'Industry', color: '#00f', items: [item('i1'), item('i2'), item('i3')] },
      ai: { label: 'AI', color: '#f0f', items: [] }, // failed feed is skipped
      extra: { label: 'Extra', items: [item('e1')] },
    },
  })
  const picked = pickHeadlines(s)
  assert.deepEqual(picked.map((f) => f.label), ['Industry', 'Tech', 'Extra'])
  assert.deepEqual(picked.map((f) => f.items.length), [2, 2, 1])
  const b = composeBrief(s, { now: WED, restDays: [] })
  assert.ok(b.html.includes('i1'))
  assert.ok(!b.html.includes('Feeds did not load'))
})

test('rest days: parsed from REST_DAYS, default Saturday', () => {
  assert.deepEqual(parseRestDays(undefined), [6])
  assert.deepEqual(parseRestDays(''), [6])
  assert.deepEqual(parseRestDays('5,6'), [5, 6])
  assert.deepEqual(parseRestDays(' 5, 6 '), [5, 6]) // no phantom Sunday from whitespace
  assert.deepEqual(parseRestDays('none'), [])
  assert.deepEqual(parseRestDays('7,x,0'), [0])
  const fri = new Date(2026, 9, 2, 7)
  assert.equal(isRestDay(fri, [5, 6]), true)
  assert.equal(isRestDay(fri, [6]), false)
  assert.equal(composeBrief(snap(), { now: fri, restDays: [5, 6] }).skip, true)
  assert.equal(composeBrief(snap(), { now: fri, restDays: [] }).skip, false)
})

test('dashboard link: valid file URL on POSIX and Windows paths; no fake STOP line', () => {
  const posix = composeBrief(snap(), { now: WED, restDays: [], dashboardPath: '/home/me/command center/index.html' })
  assert.ok(posix.html.includes('href="file:///home/me/command%20center/index.html"'))
  assert.ok(!posix.html.includes('file:////'))
  assert.ok(posix.text.includes('Open dashboard: file:///home/me/command%20center/index.html'))
  const win = composeBrief(snap(), { now: WED, restDays: [], dashboardPath: 'C:\\Users\\me\\cc\\index.html' })
  assert.ok(win.html.includes('href="file:///C:/Users/me/cc/index.html"'))
  assert.ok(!posix.html.includes('Reply STOP'))
})

test('subject and headings avoid em dashes', () => {
  const b = composeBrief(snap(), { now: WED, restDays: [] })
  assert.ok(!b.subject.includes('—'))
  assert.match(b.subject, /^⚡ Morning Brief · Sep 30 · /)
  assert.ok(!/^[A-Z :]*—/m.test(b.text))
})

test('overlay: saved done flags, added tasks, deals and health flow into the brief', () => {
  const overlay = {
    tasks: [{ id: 't1', done: true }, { id: 'new', company: 'c', priority: 'critical', title: 'Added in dashboard', category: 'Ops', done: false, dueISO: TODAY }],
    deals: [{ id: 'd9', company: 'c', name: 'Fresh deal', value: 7000, stage: 'warm', nextAction: 'Call', dueDate: '2026-10-01' }],
    health: { c: 30 },
  }
  const merged = applyOverlay(snap(), overlay)
  assert.equal(merged.tasks.find((t) => t.id === 't1').done, true)
  assert.ok(merged.tasks.some((t) => t.id === 'new'))
  assert.equal(merged.companies.find((c) => c.id === 'c').health, 30)
  assert.equal(snap().companies.find((c) => c.id === 'c').health, 90) // original untouched
  const b = composeBrief(merged, { now: WED, restDays: [] })
  assert.match(b.text, /Added in dashboard/)
  assert.match(b.text, /Gamma \(H30\).*\$7K pipeline \(1\)/)
  assert.match(b.text, /next deal: Fresh deal \(in 1d\)/)
})
