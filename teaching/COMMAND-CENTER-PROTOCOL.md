# THE COMMAND CENTER BUILD PROTOCOL
### How to build a self-updating business Command Center with an automated daily email brief
*A step-by-step build guide by Yuri Kruman*

> This is the exact app, built step by step, so you (or a student) can reproduce it for any business. You end with a dashboard you double-click open offline, an automation that refreshes it while you sleep and a morning brief in your inbox before you wake. No subscriptions, no server to babysit, no vendor deciding what you see.

---

## 0. WHAT YOU ARE BUILDING

A **Command Center**: a single place to run your business, plus an engine that keeps it current and reports to you every morning.

It has three things you can see and touch:

1. **A dashboard** (`index.html`) you open with one double-click. It works offline, opens instantly, and shows your companies or projects, your pipeline, your goals, your tasks and your live feeds. You edit it directly and it remembers your edits.
2. **An engine** (a handful of small scripts) that runs on a schedule: it pulls fresh news from the sources you chose, reads your notes digest, rebuilds the dashboard's data, and emails you a brief.
3. **A morning brief** in your inbox: top 3 actions today, what is due this week, where each part of the business stands, the market headlines that matter and any risk flags.

The whole thing is plain files in one folder. That is the point: it is portable, ownable and teachable.

### 0.1 Who can build this, and the three tracks

| Track | Who | What they build | Time |
|---|---|---|---|
| **No-Code** | Non-technical readers | The same idea in a spreadsheet plus a daily reminder | 90 min |
| **Low-Code** | Comfortable copy-pasting code | The dashboard + a script they run by hand | 1 weekend |
| **Full-Code** | Builders | The complete app: data layer, feeds, brief engine, auto-email, scheduler | 2 weekends |

This protocol teaches the **Full-Code** build in full, because everything else is a subset of it. The No-Code track is described at the end of each relevant module so a non-technical reader still finishes with a working Command Center.

### 0.2 How this protocol is written (so you can teach it)

Each module follows the same shape: **Objective, What this part does, The file, Build steps, Key code, Checkpoint, Common failure modes, Adapt it to your business.** That repetition is deliberate. It lets a learner predict the rhythm and lets you, the teacher, run every module the same way.

Each Checkpoint is a small artifact graded on four levels: **Functional** (it runs), **Aligned** (it holds your real business data, not the demo's), **Leveraged** (you would miss it if it broke) and **Transferable** (you can teach it). Aim for Aligned before moving on.

### 0.3 Prerequisites (Full-Code track)

- **Node.js** installed (version 20 or newer). Check with `node --version`.
- A **code editor** (VS Code is fine).
- A **terminal** (PowerShell on Windows, Terminal on Mac or Linux).
- For the email step: an email account with an **app password** (Gmail used here as the example).
- Comfort *reading* code. You do not need to write much. You will copy, paste and adapt.

### 0.4 The finished folder, at a glance

```
command-center/
├── index.html              ← the dashboard you double-click (offline)
├── data.js                 ← generated snapshot the dashboard reads (auto-built)
├── package.json            ← project + the npm commands
├── .env                    ← your email credentials (never shared)
├── .env.example            ← template for .env
├── scripts/
│   ├── data.mjs            ← YOUR BUSINESS DATA (the source of truth)
│   ├── feeds.mjs           ← fetches + parses RSS news feeds
│   ├── digest.mjs          ← reads your latest notes digest
│   ├── build-data.mjs      ← writes data.js (feeds + digest + your data)
│   ├── brief.mjs           ← composes the morning email (HTML + text)
│   ├── email.mjs           ← sends the email via Gmail
│   ├── env.mjs             ← loads .env
│   └── daily-brief.mjs     ← the orchestrator the scheduler runs
└── setup/
    ├── install-scheduler.ps1   ← registers the daily run (Windows)
    └── uninstall-scheduler.ps1
```

Keep this map in view. Every module below builds one of these files.

---

## PART 1 — THE ARCHITECTURE

> **Objective.** Be able to draw the system from memory before you build it. (If you can teach the picture, you can teach the app.)

### 1.1 The five parts

Every Command Center has the same five parts. Learn these names.

1. **Source of Truth** (`scripts/data.mjs`): one file holding your business data: companies/projects, pipeline deals, goals, tasks, and the list of feeds you follow. You edit this. Everything reads from it.
2. **Intelligence Layer** (`feeds.mjs`, `digest.mjs`): the outside signal you let in: news feeds and your own notes digest.
3. **Engine** (`build-data.mjs`, `daily-brief.mjs`): the automation that runs on a schedule, gathers intelligence, rebuilds the data and composes the brief.
4. **Surface** (`index.html`): the dashboard you open. The readable face of your data.
5. **Delivery** (`brief.mjs`, `email.mjs`, scheduler): the morning brief, pushed to your inbox.

### 1.2 The data flow (memorize this one line)

```
  SOURCE OF TRUTH  ──►  ENGINE  ──►  data.js  ──►  index.html
   (scripts/data.mjs)   (gather +    (snapshot)    (dashboard)
                         compose)
                            │
                            └──►  EMAIL BRIEF (your inbox)
```

You maintain `data.mjs`. The Engine runs each morning, pulls feeds, writes `data.js` and emails the brief. The dashboard reads `data.js`. The dashboard never does heavy work itself, which is why it is fast and always opens.

### 1.3 The one rule that makes it reliable: offline-first, push-second

**The thing you open must never depend on a server running.** A dashboard that needs a live process is dead exactly when you need it. So:

- The **dashboard is a static file** (`index.html`) that opens with a double-click and works with the internet off.
- The **engine is separate** and only needs to run once a day. If it fails one morning, yesterday's dashboard still opens fine.

This separation is the difference between a tool you trust daily and a toy you abandon in a week. Reliability is the first feature. Build for it.

> **Checkpoint P1.** On one page, draw the five parts and the data-flow line, and name the file for each. *Aligned* means you can also say, in one sentence each, what would break the app if that part failed.

---

## PART 2 — PROJECT SETUP

> **Objective.** Create the folder and the project file so the build has a home. (15 minutes.)

### 2.1 Create the folder and initialize

```powershell
mkdir command-center
cd command-center
npm init -y
mkdir scripts
mkdir setup
```

### 2.2 Create `package.json` commands

Open `package.json` and replace the `"scripts"` block with these. They are the five commands you and your students will actually run.

```json
{
  "name": "command-center",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "brief":        "node scripts/daily-brief.mjs",
    "brief:dry":    "node scripts/daily-brief.mjs --no-email",
    "refresh":      "node scripts/build-data.mjs",
    "verify-email": "node scripts/daily-brief.mjs --verify",
    "open":         "start index.html"
  },
  "dependencies": {
    "nodemailer": "^6.10.1"
  }
}
```

What each command does:
- `npm run refresh` rebuilds the dashboard data (fetch feeds + read digest). No email.
- `npm run brief` does the full morning run: refresh + email.
- `npm run brief:dry` does the full run but prints the brief instead of sending. For testing.
- `npm run verify-email` checks your email credentials without sending.
- `npm run open` opens the dashboard.

### 2.3 Install the one dependency

```powershell
npm install
```

That installs `nodemailer` (the email sender). Everything else uses Node's built-ins. One dependency is on purpose: fewer moving parts, fewer things to break.

> **Checkpoint P2.** `npm run open` opens an empty browser tab (the dashboard does not exist yet, that is expected). `node --version` and `npm --version` both print. *Aligned:* the folder matches the map in 0.4.

---

## PART 3 — THE BUILD

Build the files in dependency order. Each module produces one working piece you can verify before moving on.

---

### MODULE 1 — The Source of Truth (`scripts/data.mjs`)

**Objective.** Put your real business data into one file every other part reads from.
**What this part does.** Holds your companies/projects, pipeline, goals, tasks and feed list as plain data. This is the only file you edit day to day when your business changes.

#### The file

`scripts/data.mjs` exports named lists. Here is the shape, with one example of each. Replace the contents with your own business.

```js
// scripts/data.mjs — YOUR BUSINESS DATA (the single source of truth)

// Companies or projects you run
export const COMPANIES = [
  {
    id: 'acme',                 // unique short id, no spaces
    name: 'Acme Consulting',
    emoji: '🎯',
    tagline: 'Fractional ops practice',
    color: '#0ea5e9',           // accent color on the card
    health: 60,                 // 0-100, your gut health score
    revenueLabel: 'MRR',
    revenueCurrent: 0,
    revenueTarget: 12500,
    pipelineCount: 3,
    pipelineValue: 84000,
    focusAction: 'Send the proposal you keep putting off',
    kpis: [
      { label: 'Pipeline', value: '$84K' },
      { label: 'Top deal', value: 'Series B SaaS' },
    ],
    notes: '',
  },
]

// Pipeline deals (the kanban cards)
export const PIPELINE_DEALS_DEFAULT = [
  { id: 'd1', company: 'acme', name: 'Series B SaaS pilot', value: 84000,
    stage: 'qualified', nextAction: 'Book discovery call', dueDate: '2026-06-15' },
]

// Quarterly goals / OKRs
export const OKRS_DEFAULT = [
  { company: 'acme', objective: 'Land first pilot, reach $12.5K MRR',
    krs: [ { label: 'Discovery calls', current: 2, target: 6 },
           { label: 'Proposals sent', current: 1, target: 3 },
           { label: 'MRR', current: 0, target: 12500, format: 'currency' } ] },
]

// Tasks
export const TASKS_DEFAULT = [
  { id: 't1', priority: 'critical', company: 'acme',
    title: 'Send the Series B proposal', category: 'Sales',
    done: false, dueDate: 'Today', dueISO: '2026-06-09' },
]

// Status of any background systems you run (optional, can be [])
export const BUILD_STATUS = []

// The pipeline stages (the kanban columns)
export const STAGES = [
  { key: 'cold',      label: 'Cold',      color: '#3d5068' },
  { key: 'warm',      label: 'Warm',      color: '#f97316' },
  { key: 'qualified', label: 'Qualified', color: '#0ea5e9' },
  { key: 'proposal',  label: 'Proposal',  color: '#a855f7' },
  { key: 'closed',    label: 'Closed',    color: '#22c55e' },
]

// The news feeds your morning brief will pull
export const FEED_SOURCES = [
  { id: 'industry', label: 'My Industry', color: '#0ea5e9',
    url: 'https://news.google.com/rss/search?q=YOUR+TOPIC&hl=en-US&gl=US&ceid=US:en',
    description: 'What is moving in my market' },
]
```

#### Build steps

1. List your companies or projects. Give each a short `id`, a `name`, a `color` and an honest `health` score.
2. Add your real pipeline deals, goals and tasks. Use real numbers. A Command Center earns trust by being honest, so use `0` where something is unpaid or unstarted, not an aspirational figure.
3. Pick 3 to 5 news feeds. The easiest source is a Google News RSS search: take `https://news.google.com/rss/search?q=` and add your search terms joined by `+`.

#### Key idea: ids tie everything together

Every deal, task and goal references a company by its `id` (for example `company: 'acme'`). Keep ids short, lowercase and stable. If you rename a company's display `name`, leave its `id` alone so nothing breaks.

> **Checkpoint M1.** `scripts/data.mjs` holds your real business, 5 to 9 companies/projects max for version one. *Aligned:* every number is one you would bet on. *Common failure:* inflating numbers, or changing an `id` later and breaking references.

**Adapt it to your business.** Solo consultant? "Companies" become your service lines. Agency? Your clients. Creator? Your products. The structure does not change.

**No-Code version.** Make a spreadsheet with one tab each: Companies, Pipeline, Goals, Tasks, Feeds. Same columns. That sheet is your Source of Truth.

---

### MODULE 2 — The Engine that writes the snapshot (`scripts/build-data.mjs`)

**Objective.** Turn your data plus fresh feeds into the single `data.js` file the dashboard reads.
**What this part does.** Imports your `data.mjs`, fetches the feeds, reads your notes digest, and writes one file: `data.js`, which sets `window.__CC__` to the whole snapshot.

#### Why a generated snapshot

The dashboard cannot fetch news directly (browsers block cross-site feed requests) and a file opened by double-click cannot run server code. So the engine does all the gathering and bakes the result into `data.js`. The dashboard just reads it. This is what lets the dashboard be a dumb, fast, always-opens file.

#### The file (complete)

```js
// scripts/build-data.mjs
import './env.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './env.mjs'
import { COMPANIES, PIPELINE_DEALS_DEFAULT, OKRS_DEFAULT,
         TASKS_DEFAULT, BUILD_STATUS, FEED_SOURCES, STAGES } from './data.mjs'
import { fetchAllFeeds } from './feeds.mjs'
import { readLatestDigest } from './digest.mjs'

export async function buildData({ fetchFeeds = true } = {}) {
  const generatedAt = new Date().toISOString()

  let feeds = {}
  if (fetchFeeds) {
    try { feeds = await fetchAllFeeds(FEED_SOURCES) }
    catch (err) { console.error('[build-data] feeds failed:', err.message) }
  }

  const digest = readLatestDigest()

  const snapshot = {
    generatedAt,
    companies: COMPANIES,
    deals: PIPELINE_DEALS_DEFAULT,
    okrs: OKRS_DEFAULT,
    tasks: TASKS_DEFAULT,
    builds: BUILD_STATUS,
    stages: STAGES,
    feedSources: FEED_SOURCES.map(({ id, label, color, description }) =>
      ({ id, label, color, description })),
    feeds,
    digest,
  }

  const body = '// AUTO-GENERATED. Do not edit by hand.\n'
    + 'window.__CC__ = ' + JSON.stringify(snapshot, null, 2) + ';\n'

  fs.writeFileSync(path.join(ROOT, 'data.js'), body, 'utf8')
  return { snapshot }
}

// Allow: node scripts/build-data.mjs
if (process.argv[1] && process.argv[1].endsWith('build-data.mjs')) {
  buildData({ fetchFeeds: true })
    .then(({ snapshot }) => {
      const f = Object.values(snapshot.feeds).map(x => x.label + ':' + x.items.length).join('  ')
      console.log('Wrote data.js  Feeds:', f || '(none)')
    })
    .catch(e => { console.error(e); process.exit(1) })
}
```

(You will build `env.mjs`, `feeds.mjs` and `digest.mjs` in the next two modules. Build this file now and run it after those exist.)

> **Checkpoint M2.** After Modules 3 and 4 exist, `npm run refresh` prints `Wrote data.js Feeds: ...` and a `data.js` file appears. *Common failure:* editing `data.js` by hand. Never do that, it is generated. Edit `data.mjs`.

---

### MODULE 3 — The supporting engine files (`env.mjs`, `digest.mjs`)

**Objective.** Two tiny helpers the engine needs.

#### `scripts/env.mjs` (loads your `.env` and finds the project root)

```js
// scripts/env.mjs — loads .env into process.env, no dependencies
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(ROOT, '.env')

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2].trim().replace(/^["']|["']$/g, '')
    if (!(m[1] in process.env)) process.env[m[1]] = v
  }
}
```

#### `scripts/digest.mjs` (reads your latest notes digest, optional)

If you keep a folder of daily notes (Markdown files named like `2026-06-09.md`), this reads the newest one into the dashboard and brief. If you do not, it returns `null` and everything still works.

```js
// scripts/digest.mjs
import fs from 'node:fs'
import path from 'node:path'

// Point this at YOUR notes folder, or leave it and it returns null safely
const DIGEST_DIR = 'C:\\Users\\you\\notes\\daily'

export function readLatestDigest() {
  try {
    if (!fs.existsSync(DIGEST_DIR)) return null
    const files = fs.readdirSync(DIGEST_DIR)
      .filter(f => f.endsWith('.md')).sort().reverse()
    if (!files.length) return null
    const latest = files[0]
    return {
      content: fs.readFileSync(path.join(DIGEST_DIR, latest), 'utf8'),
      filename: latest,
      date: latest.replace('.md', ''),
      recent: files.slice(0, 7).map(f => ({ filename: f, date: f.replace('.md', '') })),
    }
  } catch { return null }
}
```

> **Checkpoint M3.** Both files exist. Nothing to run yet. *Aligned:* `DIGEST_DIR` points at a real folder of yours, or you accept it returning null.

---

### MODULE 4 — The Intelligence Layer (`scripts/feeds.mjs`)

**Objective.** Fetch and parse your news feeds, server-side, so there are no browser restrictions.
**What this part does.** Downloads each feed URL, pulls out the title, link, date and summary of each item, and returns them as clean data.

#### The file (complete, no dependencies)

```js
// scripts/feeds.mjs — fetch + parse RSS/Atom, no dependencies
function tag(str, t) {
  const m = str.match(new RegExp(
    `<${t}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${t}>`, 'i'))
  return m ? (m[1] ?? m[2] ?? '').trim() : ''
}
function attr(str, t, a) {
  const m = str.match(new RegExp(`<${t}[^>]*${a}=["']([^"']*)["']`, 'i'))
  return m ? m[1] : ''
}
function decode(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
}
function parse(xml, limit = 12) {
  const items = []
  const re = /<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/g
  let m
  while ((m = re.exec(xml)) !== null && items.length < limit) {
    const b = m[1]
    const link = attr(b, 'link', 'href') || tag(b, 'link')
    const title = decode(tag(b, 'title'))
    if (!title || !link) continue
    const desc = decode((tag(b,'description')||tag(b,'summary')||tag(b,'content'))
                  .replace(/<[^>]+>/g, '')).trim().slice(0, 220)
    items.push({ title, link,
      pubDate: tag(b,'pubDate')||tag(b,'published')||tag(b,'updated')||'',
      description: desc, source: decode(tag(b,'source')) })
  }
  return items
}

export async function fetchFeed(url, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: {
      'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml, application/xml, */*' } })
    if (!res.ok) return { items: [], error: 'HTTP ' + res.status }
    return { items: parse(await res.text()), error: null }
  } catch (e) {
    return { items: [], error: e.name === 'AbortError' ? 'timeout' : e.message }
  } finally { clearTimeout(timer) }
}

export async function fetchAllFeeds(sources) {
  const entries = await Promise.all(sources.map(async s => {
    const { items, error } = await fetchFeed(s.url)
    return [s.id, { id: s.id, label: s.label, color: s.color,
      description: s.description, items, error, fetchedAt: new Date().toISOString() }]
  }))
  return Object.fromEntries(entries)
}
```

#### Build steps

1. Save the file.
2. Now run `npm run refresh`. It will fetch your feeds and write `data.js`.

> **Checkpoint M4.** `npm run refresh` prints feed counts greater than 0, for example `My Industry:12`. *Common failure:* a feed URL with spaces (encode them as `+`) or a 403 (some sites block bots; switch to a Google News RSS search for that topic). *Aligned:* every feed ties to a real question you act on. Cut any feed that has not changed a decision in a month.

---

### MODULE 5 — The Surface (`index.html`)

**Objective.** Build the dashboard that reads `data.js` and opens offline.
**What this part does.** A single self-contained HTML file: all styles and all JavaScript inline, no dependencies, no CDN. It reads `window.__CC__` from `data.js` and renders six tabs.

#### Why a single vanilla file

So it opens by double-click, works offline and never breaks because a CDN was down. It is the most important reliability decision in the build.

#### The structure

The file has three parts:
1. **`<style>`**: the dark theme and layout (design tokens as CSS variables, then component styles).
2. **`<script src="data.js">`**: loads the generated snapshot into `window.__CC__`.
3. **`<script>`**: the app, one self-contained function that renders the views.

The app's skeleton:

```html
<body>
<div id="app"></div>
<script src="data.js"></script>
<script>
(function(){
  var CC = window.__CC__ || null          // the snapshot
  // --- storage: your edits overlay the data, saved in the browser
  var V = 'v1'
  function key(n){ return 'cc_'+n+'_'+V }
  function save(n,v){ try{ localStorage.setItem(key(n), JSON.stringify(v)) }catch(e){} }
  function load(n,fb){ try{ var r=localStorage.getItem(key(n)); return r?JSON.parse(r):fb }catch(e){ return fb } }

  // --- merge: defaults from CC, your edits from localStorage
  // (tasks done-state, added tasks, edited deals, notes, health overrides)

  // --- views: one function each that returns an HTML string
  function vPortfolio(){ /* company cards + KPIs */ }
  function vPipeline(){ /* kanban from CC.deals + CC.stages */ }
  function vOKR(){ /* goals from CC.okrs */ }
  function vTasks(){ /* task list from CC.tasks */ }
  function vFeeds(){ /* CC.feeds + CC.digest */ }
  function vBuilds(){ /* CC.builds table */ }

  function render(){ /* nav + sidebar + current view into #app */ }

  // --- one click handler for the whole app (event delegation)
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-act]'); if(!t) return
    // switch on t.getAttribute('data-act'): tab, toggle-task, edit-deal, etc.
  })

  render()
})()
</script>
</body>
```

The complete, working `index.html` is in the reference build (see Appendix B). For teaching, the patterns that matter are:

- **Read-only source, editable overlay.** `data.js` is regenerated every morning, so the dashboard must never store your edits there. Instead, your edits (a task checked off, a note typed, a deal edited) are saved in the browser's `localStorage` and merged on top of `data.js` at render time. This is why the morning refresh never erases your work.
- **Render-to-string.** Each view returns an HTML string, `render()` drops it into `#app`. Simple and fast, no framework.
- **One click handler.** Every button carries a `data-act="..."` attribute. A single listener reads it and acts. This keeps the whole app in one small function.
- **A stale-data badge.** If `data.js` is more than a day old, show a small warning so you know the engine has not run.

#### Build steps

1. Copy `index.html` from the reference build, or build it from the skeleton above.
2. Make sure `data.js` exists (run `npm run refresh` first).
3. Double-click `index.html`. It opens in your browser, offline.

> **Checkpoint M5.** Double-clicking `index.html` shows your real companies, pipeline, goals and tasks, and the Feeds tab shows fresh headlines. *Leveraged:* a five-second glance tells you where today's attention goes. *Common failure:* opening `index.html` before `data.js` exists (you will see a friendly "run npm run refresh" message, which is correct).

**No-Code version.** Your spreadsheet, with a clean summary tab and conditional-formatting "health" colors, is your dashboard. Pin it as a browser tab.

---

### MODULE 6 — The brief composer (`scripts/brief.mjs`)

**Objective.** Turn the snapshot into a ranked morning brief (HTML for the email, plain text as a fallback).
**What this part does.** Reads the snapshot and produces the email's subject, HTML body and text body. It ranks your actions and sorts what is due.

#### The shape of the brief

Ordered top to bottom by usefulness:
1. Greeting, date, an urgency line (how many overdue, how many due today).
2. **Top 3 actions today**, ranked (critical before high), only things you can act on.
3. **Due this week**: pipeline items and tasks with the nearest dates.
4. **Where each part stands**: one line per company, lowest health first.
5. **Market signal**: 2 to 3 headlines from your feeds.
6. **Risk flags**: anything stale or overdue.

#### The core logic (the part worth teaching)

```js
// scripts/brief.mjs (essence)
import { fmt } from './data.mjs'   // small money-formatting helper

export function composeBrief(snapshot, { now = new Date() } = {}) {
  const today = now.toISOString().slice(0, 10)
  const rank = { critical: 0, high: 1, medium: 2, low: 3 }

  const open = snapshot.tasks.filter(t => !t.done)
    .sort((a, b) => (rank[a.priority] - rank[b.priority])
                 || (a.dueISO || '9999').localeCompare(b.dueISO || '9999'))

  const top3   = open.filter(t => t.priority==='critical' || t.priority==='high').slice(0, 3)
  const overdue = open.filter(t => t.dueISO && t.dueISO < today)

  const dueSoon = snapshot.deals
    .filter(d => d.stage !== 'closed' && /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate || ''))
    .filter(d => (new Date(d.dueDate) - new Date(today)) / 86400000 <= 7)

  const subject = `Morning Brief — ${top3.length} actions`
    + (overdue.length ? `, ${overdue.length} overdue` : '')

  // ...build html and text strings from top3, dueSoon, companies, feeds...
  return { skip: false, subject, html, text }
}
```

The principle to teach: **the brief decides what to read first, so you never have to.** Cap the lead at three actions. A brief that lists fifteen "priorities" teaches you to dread it.

#### Optional: a rest day

If your week has a day you never work, have `composeBrief` return `{ skip: true }` on that day so the engine refreshes data but does not email. (The default skips Saturday. Set it to whatever fits your week.)

> **Checkpoint M6.** After Module 7 exists, `npm run brief:dry` prints a readable brief with your real top 3. *Aligned:* the top 3 are genuinely the right 3.

---

### MODULE 7 — Email + the orchestrator (`email.mjs`, `daily-brief.mjs`)

**Objective.** Send the brief, and wire the whole morning run into one command.

#### `scripts/email.mjs` (Gmail via nodemailer)

```js
// scripts/email.mjs
import nodemailer from 'nodemailer'

export function hasEmailConfig() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}
export function makeTransport() {
  return nodemailer.createTransport({ service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
}
export async function sendBrief({ subject, html, text }) {
  const from = process.env.GMAIL_USER
  return makeTransport().sendMail({
    from: 'Command Center <' + from + '>',
    to: process.env.BRIEF_TO || from, subject, text, html })
}
export async function verifyEmail() { await makeTransport().verify(); return true }
```

#### `scripts/daily-brief.mjs` (the orchestrator the scheduler runs)

```js
// scripts/daily-brief.mjs
import './env.mjs'
import path from 'node:path'
import { ROOT } from './env.mjs'
import { buildData } from './build-data.mjs'
import { composeBrief } from './brief.mjs'
import { sendBrief, verifyEmail, hasEmailConfig } from './email.mjs'

const args = new Set(process.argv.slice(2))

async function main() {
  if (args.has('--verify')) {
    if (!hasEmailConfig()) { console.error('No email config in .env'); process.exit(1) }
    await verifyEmail(); console.log('Email OK'); return
  }
  // 1. refresh data (fetch feeds, read digest, write data.js)
  const { snapshot } = await buildData({ fetchFeeds: !args.has('--no-fetch') })
  // 2. compose
  const brief = composeBrief(snapshot, { now: new Date() })
  if (brief.skip) { console.log('Rest day, no email. Data refreshed.'); return }
  // 3. send (or preview)
  if (args.has('--no-email')) { console.log(brief.text); return }
  if (!hasEmailConfig()) { console.error('No email config; data still refreshed'); process.exit(1) }
  const info = await sendBrief(brief)
  console.log('Sent:', info.messageId)
}
main().catch(e => { console.error(e.message); process.exit(1) })
```

#### Set up your email credentials

1. Copy the template: create `.env.example` and `.env`.

`.env.example`:
```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=
BRIEF_TO=you@gmail.com
```

2. Turn on **2-Step Verification** on your Google account, then create an **App Password** at `https://myaccount.google.com/apppasswords`. Paste the 16 characters (no spaces) into `.env` after `GMAIL_APP_PASSWORD=`.
3. Add `.env` to a `.gitignore` so the password is never shared:
```
.env
node_modules/
data.js
```

> **Security rule to teach:** never use your normal login password, only an app password, and never commit `.env`.

#### Test it

```powershell
npm run verify-email   # confirms credentials
npm run brief:dry      # prints the brief, sends nothing
npm run brief          # sends the real email to your inbox
```

> **Checkpoint M7.** `npm run brief` lands a brief in your inbox. *Leveraged:* you stopped manually checking the things the brief now tells you. *Common failure:* using your login password instead of an app password (verify-email will fail with an auth error).

---

### MODULE 8 — Schedule it (Windows Task Scheduler)

**Objective.** Make the brief arrive automatically every morning, no clicks.
**What this part does.** Registers a scheduled task that runs `node scripts/daily-brief.mjs` at the time you choose.

#### The installer: `setup/install-scheduler.ps1`

```powershell
# setup/install-scheduler.ps1  (run once)
$ErrorActionPreference = 'Stop'
$ProjectDir = Split-Path -Parent $PSScriptRoot
$Script     = Join-Path $ProjectDir 'scripts\daily-brief.mjs'
$NodeExe    = (Get-Command node).Source
$TaskName   = 'CommandCenter-MorningBrief'

$Action  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$Script`"" -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -Weekly `
  -DaysOfWeek Sunday,Monday,Tuesday,Wednesday,Thursday,Friday -At 7:00AM
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger `
  -Settings $Settings -Principal $Principal
Write-Host "Installed. Runs Sun-Fri 7:00 AM."
```

Notes to teach:
- `-DaysOfWeek` controls which days. Drop a day to skip it (the example skips Saturday).
- `-At 7:00AM` is the time. Change it and re-run the script.
- `-StartWhenAvailable` plus `-WakeToRun` means a missed or asleep machine still runs.

#### Install and test

```powershell
powershell -ExecutionPolicy Bypass -File setup\install-scheduler.ps1
Start-ScheduledTask -TaskName CommandCenter-MorningBrief   # test now
Get-ScheduledTaskInfo -TaskName CommandCenter-MorningBrief # see last result + next run
```

> **Checkpoint M8.** `Get-ScheduledTaskInfo` shows a `NextRunTime` tomorrow at your chosen time. A manual `Start-ScheduledTask` refreshes `data.js` and (if `.env` is set) emails you. *Common failure:* node not on PATH for the scheduler (the script resolves the full path with `Get-Command node` to avoid this).

**Mac or Linux version.** Use `cron`. `crontab -e`, then `0 7 * * 0-5 cd /path/to/command-center && /usr/local/bin/node scripts/daily-brief.mjs`. Same script, different scheduler.

---

### MODULE 9 — The daily ritual and upkeep

**Objective.** Turn the app into a habit, and keep it healthy.
**What this part does.** Nothing to build. This is how you operate it.

#### The morning loop (10 minutes)

1. Read the brief on your phone.
2. Commit to the top 3 actions.
3. Open the dashboard only if a number needs your judgment.
4. Close it, do action one, do not browse.

#### Upkeep

- **Weekly:** open the dashboard, update health scores and goal progress, retire one weak feed and add one.
- **When the business changes:** edit `scripts/data.mjs` (add a deal, a project, a goal), then `npm run refresh`.
- **Backups:** use the dashboard's export button to save your edits as JSON now and then.

> **Checkpoint M9.** Seven days of reading the brief and acting on the top item, logged. *Transferable:* you could sit beside someone and walk them through all nine modules.

---

## PART 4 — TEACHING IT

A short kit for running this as a class or cohort.

### 4.1 A 4-session syllabus

- **Session 1:** Parts 1 and 2 plus Module 1. Output: each learner's `data.mjs` with their real business.
- **Session 2:** Modules 2 to 5. Output: a working offline dashboard showing their data and live feeds.
- **Session 3:** Modules 6 and 7. Output: a brief emailed to themselves.
- **Session 4:** Module 8 and 9. Output: an automated daily brief plus a 7-day ritual plan.

### 4.2 Run each session the same way

1. Show the finished piece (the worked example).
2. Build one of yours live in front of them.
3. They build their own in the room.
4. Check against the module's Checkpoint rubric.
5. Assign the next module.

### 4.3 The grading rubric (every module)

| Level | Evidence |
|---|---|
| Functional | It runs |
| Aligned | It holds their real business data |
| Leveraged | They would miss it if it broke |
| Transferable | They can teach it to someone else |

### 4.4 The deliberate-struggle move

Before Module 4, have learners add every feed they can think of, feel the noise, then apply the "has this changed a decision in 30 days?" filter. The contrast teaches filtering better than a lecture.

### 4.5 Packaging tiers

- **Free / regular reader:** Parts 1 to 2 plus Module 1, the spreadsheet (No-Code) build.
- **Premium reader:** this full written protocol plus the reference files.
- **Student / cohort:** the 4-session course with feedback.
- **1-on-1:** you build their Command Center around their business with them.

---

## APPENDICES

### Appendix A — Command cheat sheet

```
npm run refresh        Rebuild data.js (feeds + digest). No email.
npm run brief          Full run: refresh + email the brief.
npm run brief:dry      Full run, print the brief, send nothing.
npm run verify-email   Check email credentials.
npm run open           Open the dashboard.

Schedule (Windows):
  powershell -ExecutionPolicy Bypass -File setup\install-scheduler.ps1
  Start-ScheduledTask -TaskName CommandCenter-MorningBrief
  Get-ScheduledTaskInfo -TaskName CommandCenter-MorningBrief
```

### Appendix B — The reference build (working source)

The complete, working version of every file in this protocol lives in the `command-center` folder, ready to copy and adapt:

| File | What it is |
|---|---|
| `index.html` | The full offline dashboard (six tabs, edit + persist, export/import) |
| `scripts/data.mjs` | Source of truth |
| `scripts/feeds.mjs` | Feed fetch + parse |
| `scripts/digest.mjs` | Notes digest reader |
| `scripts/build-data.mjs` | Writes `data.js` |
| `scripts/brief.mjs` | Composes the brief |
| `scripts/email.mjs` | Sends via Gmail |
| `scripts/env.mjs` | Loads `.env` |
| `scripts/daily-brief.mjs` | The orchestrator |
| `setup/install-scheduler.ps1` | Registers the daily task |

Read them in build order (Module 1 through 8). Each is small and commented.

### Appendix C — The data schema (one place to look up shapes)

```
COMPANY: { id, name, emoji, tagline, color, health(0-100),
           revenueLabel, revenueCurrent, revenueTarget,
           pipelineCount, pipelineValue, focusAction, kpis[], notes }
DEAL:    { id, company, name, value, stage, nextAction, dueDate(YYYY-MM-DD) }
OKR:     { company, objective, krs:[ { label, current, target, format? } ] }
TASK:    { id, priority(critical|high|medium|low), company, title,
           category, done(bool), dueDate(label), dueISO(YYYY-MM-DD) }
STAGE:   { key, label, color }
FEED:    { id, label, color, url, description }
```

### Appendix D — Troubleshooting

- **Dashboard says "run npm run refresh":** `data.js` does not exist yet. Run it.
- **Feeds show 0 items or an error:** the URL is blocked or wrong. Use a Google News RSS search URL for that topic, and encode spaces as `+`.
- **`verify-email` fails with auth error:** you used your login password. Create an app password instead.
- **Scheduled task did not run:** check `Get-ScheduledTaskInfo`. If node was not found, confirm `node` is on PATH or hardcode the full path in the action.
- **My edits disappeared after the morning refresh:** they should not. Edits live in the browser, `data.js` only holds defaults. If they vanished, you edited `data.js` by hand. Edit `data.mjs` instead.

### Appendix E — Adapt-it-to-your-business worksheet

```
1. My "companies" are actually: ______________________________
   (service lines / clients / products / departments)
2. My pipeline stages are: ___________________________________
3. The 3-5 feeds I will follow (and the decision each informs):
   - ________________________________________________________
4. My rest day (no email): ___________________________________
5. The time I want the brief: ________________________________
6. The one number that tells me each area is healthy: ________
```

---

## CLOSING

You now have a Command Center: a dashboard that opens offline in one click, an engine that refreshes it and emails you a ranked brief every morning, and a protocol clean enough to teach. Build it once. Let it run. Spend the time it gives you back on the work only you can do.

*Build order to teach from: data.mjs, then the engine (build-data, feeds, digest, env), then index.html, then the brief and email, then the scheduler. Reproduce it for any business by changing one file: `scripts/data.mjs`.*

---

*Protocol and reference implementation by Yuri Kruman.*
