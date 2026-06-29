// ============================================================
// BRIEF — composes the morning standup email from a data snapshot.
// Pure function of (snapshot, now): no network, no side effects.
// Produces { subject, html, text, skip } where skip=true means
// "do not send" (your day off).
// ============================================================

import { companyShort, fmt } from './data.mjs'

// ---- date helpers --------------------------------------------

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function longDate(d) {
  return `${DAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
function daysBetween(aISO, bISO) {
  const a = new Date(aISO + 'T00:00:00')
  const b = new Date(bISO + 'T00:00:00')
  return Math.round((a - b) / 86400000)
}

// ---- analysis ------------------------------------------------

function analyze(snapshot, now) {
  const today = ymd(now)
  const companyName = (id) => (snapshot.companies.find((c) => c.id === id)?.name) || companyShort(id)

  // Open tasks (not done), sorted critical → high → medium and by due date
  const prioRank = { critical: 0, high: 1, medium: 2, low: 3 }
  const openTasks = snapshot.tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      const p = (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9)
      if (p !== 0) return p
      return (a.dueISO || '9999').localeCompare(b.dueISO || '9999')
    })

  // Top actions = first 3 critical/high
  const topActions = openTasks.filter((t) => t.priority === 'critical' || t.priority === 'high').slice(0, 3)

  // Overdue + due-today tasks (by dueISO)
  const overdue = openTasks.filter((t) => t.dueISO && t.dueISO < today)
  const dueToday = openTasks.filter((t) => t.dueISO === today)

  // Pipeline deals due within 7 days (not closed)
  const soon = snapshot.deals
    .filter((d) => d.stage !== 'closed' && d.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate))
    .map((d) => ({ ...d, inDays: daysBetween(d.dueDate, today) }))
    .filter((d) => d.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays)

  // Company focus lines (companies that need attention: health < 70)
  const focus = snapshot.companies
    .filter((c) => c.health < 70 && c.focusAction)
    .sort((a, b) => a.health - b.health)

  // Stale build systems (active but lastRun > 2 days ago)
  const stale = (snapshot.builds || [])
    .filter((b) => b.status === 'active' && /^\d{4}-\d{2}-\d{2}/.test(b.lastRun))
    .map((b) => ({ ...b, ageDays: daysBetween(today, b.lastRun.slice(0, 10)) }))
    .filter((b) => b.ageDays > 2)
    .sort((a, b) => b.ageDays - a.ageDays)

  // Top feed headlines: 2 from ai-hr, 2 from ai-wage-gap, 1 from vc-funding
  const feedPick = []
  const pick = (id, n) => {
    const f = snapshot.feeds?.[id]
    if (f?.items?.length) feedPick.push({ label: f.label, color: f.color, items: f.items.slice(0, n) })
  }
  pick('ai-hr', 2)
  pick('ai-wage-gap', 2)
  pick('vc-funding', 1)

  return { companyName, openTasks, topActions, overdue, dueToday, soon, focus, stale, feedPick }
}

// ---- Rest-day detection --------------------------------------
// On your day(s) off, refresh the data silently but do not send an
// email. Customize this to your week. Default: skip Saturday.
function isRestDay(now) {
  const day = now.getDay() // 0 Sun ... 6 Sat
  if (day === 6) return true                 // Saturday
  return false
}

// ---- HTML rendering ------------------------------------------

const C = {
  bg: '#0b1620', card: '#10212e', border: '#1e3445',
  text: '#e2e8f0', muted: '#8aa0b4', dim: '#5b7488',
  accent: '#38bdf8', green: '#22c55e', orange: '#f97316', red: '#ef4444', purple: '#a855f7',
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function htmlBrief(snapshot, a, now, openDashboardPath) {
  const row = (inner) => `<tr><td style="padding:0 24px;">${inner}</td></tr>`
  const sectionTitle = (t) =>
    `<div style="font:700 11px/1.4 Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;color:${C.accent};margin:22px 0 10px;">${esc(t)}</div>`

  // Top actions
  const actionsHtml = a.topActions.length
    ? a.topActions.map((t, i) => `
        <div style="margin:0 0 10px;padding:12px 14px;background:${C.card};border:1px solid ${C.border};border-left:3px solid ${t.priority === 'critical' ? C.red : C.orange};border-radius:8px;">
          <div style="font:700 11px/1 Arial;color:${t.priority === 'critical' ? C.red : C.orange};text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px;">${i + 1}. ${esc(t.priority)} · ${esc(a.companyName(t.company))}</div>
          <div style="font:400 14px/1.45 Arial;color:${C.text};">${esc(t.title)}</div>
          <div style="font:400 11px/1 Arial;color:${C.dim};margin-top:6px;">${esc(t.category)}${t.dueDate ? ' · due ' + esc(t.dueDate) : ''}</div>
        </div>`).join('')
    : `<div style="font:400 13px/1.5 Arial;color:${C.muted};">No open critical or high-priority tasks. Clear runway.</div>`

  // Overdue / due today line
  const urgency = []
  if (a.overdue.length) urgency.push(`<span style="color:${C.red};font-weight:700;">${a.overdue.length} overdue</span>`)
  if (a.dueToday.length) urgency.push(`<span style="color:${C.orange};font-weight:700;">${a.dueToday.length} due today</span>`)
  const urgencyHtml = urgency.length
    ? `<div style="font:400 13px/1.5 Arial;color:${C.muted};margin-top:4px;">${urgency.join(' &nbsp;·&nbsp; ')} across the portfolio</div>`
    : ''

  // Pipeline due soon
  const soonHtml = a.soon.length
    ? a.soon.slice(0, 8).map((d) => `
        <div style="margin:0 0 7px;padding-bottom:7px;border-bottom:1px solid ${C.border};">
          <div style="font:600 13px/1.4 Arial;color:${C.text};">${esc(d.name)}</div>
          <div style="font:400 11px/1.4 Arial;color:${C.muted};margin-top:2px;">
            ${esc(a.companyName(d.company))} ${d.value > 0 ? '· ' + esc(fmt(d.value)) : ''}
            · <span style="color:${d.inDays <= 0 ? C.red : d.inDays <= 2 ? C.orange : C.muted};">${d.inDays <= 0 ? 'due now' : 'in ' + d.inDays + 'd'}</span>
          </div>
          <div style="font:400 11px/1.4 Arial;color:${C.dim};margin-top:3px;">→ ${esc(d.nextAction)}</div>
        </div>`).join('')
    : `<div style="font:400 13px/1.5 Arial;color:${C.muted};">Nothing due in the next 7 days.</div>`

  // Company focus
  const focusHtml = a.focus.map((c) => `
      <div style="margin:0 0 8px;">
        <span style="display:inline-block;font:700 10px/1.6 Arial;color:#fff;background:${c.color};border-radius:4px;padding:1px 7px;margin-right:6px;">${esc(c.name)}</span>
        <span style="font:400 12px/1.5 Arial;color:${C.muted};">H${c.health} · ${esc(c.focusAction)}</span>
      </div>`).join('')

  // Feeds
  const feedHtml = a.feedPick.length
    ? a.feedPick.map((f) => `
        <div style="margin:0 0 12px;">
          <div style="font:700 10px/1.4 Arial;letter-spacing:.5px;text-transform:uppercase;color:${f.color};margin-bottom:5px;">${esc(f.label)}</div>
          ${f.items.map((it) => `<div style="margin:0 0 6px;"><a href="${esc(it.link)}" style="font:600 13px/1.4 Arial;color:${C.text};text-decoration:none;">${esc(it.title)}</a></div>`).join('')}
        </div>`).join('')
    : `<div style="font:400 12px/1.5 Arial;color:${C.dim};">Feeds did not load this morning. They will retry tomorrow.</div>`

  // Digest
  const digestHtml = snapshot.digest
    ? `<div style="font:400 12px/1.6 Arial;color:${C.muted};">
         <div style="font:700 12px/1.4 Arial;color:${C.text};margin-bottom:4px;">${esc(snapshot.digest.filename)}</div>
         ${esc((snapshot.digest.content || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 5).join(' · ')).slice(0, 360)}
       </div>`
    : `<div style="font:400 12px/1.5 Arial;color:${C.dim};">No KB digest found. Run KB ingest to populate.</div>`

  // Stale systems
  const staleHtml = a.stale.length
    ? `<div style="margin-top:10px;font:400 12px/1.5 Arial;color:${C.muted};">⚠ Stale crons: ${a.stale.map((s) => esc(s.label) + ' (' + s.ageDays + 'd)').join(', ')}</div>`
    : ''

  // Business activity from the optional KB ingest (if configured)
  const kbItems = (snapshot.feeds && snapshot.feeds.business && snapshot.feeds.business.items) || []
  const kbHtml = kbItems.length
    ? kbItems.slice(0, 6).map((it) => `
        <div style="margin:0 0 7px;">
          <span style="font:700 9px/1.4 Arial;text-transform:uppercase;letter-spacing:.5px;color:${it.kind === 'signal' ? C.green : C.dim};">${esc(it.source)}</span>
          <span style="font:400 12.5px/1.45 Arial;color:${C.text};"> ${esc(it.title)}</span>
        </div>`).join('')
    : ''

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.bg};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
  <tr><td style="padding:24px 24px 8px;">
    <div style="font:900 20px/1.1 Arial;color:${C.text};">⚡ Command Center</div>
    <div style="font:400 13px/1.4 Arial;color:${C.muted};margin-top:4px;">Good morning — ${esc(longDate(now))}</div>
    ${urgencyHtml}
  </td></tr>

  ${row(sectionTitle('Top 3 Actions Today') + actionsHtml)}
  ${kbHtml ? row(sectionTitle('Business Activity — Latest') + kbHtml) : ''}
  ${row(sectionTitle('Pipeline — Due This Week') + soonHtml)}
  ${row(sectionTitle('Where Each Company Stands') + focusHtml)}
  ${row(sectionTitle('Market Signal') + feedHtml)}
  ${row(sectionTitle('KB Digest') + digestHtml + staleHtml)}

  <tr><td style="padding:20px 24px 26px;">
    <a href="file:///${esc(openDashboardPath.replace(/\\/g, '/'))}" style="display:inline-block;font:700 13px/1 Arial;color:#001018;background:${C.accent};border-radius:8px;padding:11px 18px;text-decoration:none;">Open full dashboard →</a>
    <div style="font:400 10px/1.5 Arial;color:${C.dim};margin-top:14px;">Generated ${esc(new Date(snapshot.generatedAt).toLocaleString('en-US'))} · This brief runs automatically each morning. Reply STOP to pause.</div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

// ---- plaintext fallback --------------------------------------

function textBrief(snapshot, a, now, openDashboardPath) {
  const L = []
  L.push(`COMMAND CENTER — Good morning`)
  L.push(longDate(now))
  if (a.overdue.length || a.dueToday.length)
    L.push(`${a.overdue.length} overdue · ${a.dueToday.length} due today`)
  L.push('')
  L.push('TOP 3 ACTIONS TODAY')
  if (a.topActions.length) {
    a.topActions.forEach((t, i) => {
      L.push(`${i + 1}. [${t.priority.toUpperCase()} · ${a.companyName(t.company)}] ${t.title}${t.dueDate ? ' (due ' + t.dueDate + ')' : ''}`)
    })
  } else L.push('None — clear runway.')
  L.push('')
  const kbItems = (snapshot.feeds && snapshot.feeds.business && snapshot.feeds.business.items) || []
  if (kbItems.length) {
    L.push('BUSINESS ACTIVITY — LATEST')
    kbItems.slice(0, 6).forEach((it) => L.push(`- [${it.source}] ${it.title}`))
    L.push('')
  }
  L.push('PIPELINE — DUE THIS WEEK')
  if (a.soon.length) {
    a.soon.slice(0, 8).forEach((d) => {
      L.push(`- ${d.name} [${a.companyName(d.company)}${d.value > 0 ? ' · ' + fmt(d.value) : ''} · ${d.inDays <= 0 ? 'due now' : 'in ' + d.inDays + 'd'}]`)
      L.push(`    -> ${d.nextAction}`)
    })
  } else L.push('Nothing due in the next 7 days.')
  L.push('')
  L.push('WHERE EACH COMPANY STANDS')
  a.focus.forEach((c) => L.push(`- ${c.name} (H${c.health}): ${c.focusAction}`))
  L.push('')
  L.push('MARKET SIGNAL')
  if (a.feedPick.length) {
    a.feedPick.forEach((f) => {
      L.push(`  ${f.label}:`)
      f.items.forEach((it) => L.push(`   - ${it.title}\n     ${it.link}`))
    })
  } else L.push('Feeds did not load this morning.')
  L.push('')
  if (snapshot.digest) {
    L.push('KB DIGEST: ' + snapshot.digest.filename)
  }
  if (a.stale.length) L.push('STALE CRONS: ' + a.stale.map((s) => `${s.label} (${s.ageDays}d)`).join(', '))
  L.push('')
  L.push('Open dashboard: file:///' + openDashboardPath.replace(/\\/g, '/'))
  L.push('This brief runs automatically each morning.')
  return L.join('\n')
}

// ---- public API ----------------------------------------------

/**
 * @param {object} snapshot  output of buildData()
 * @param {object} opts      { now?: Date, dashboardPath?: string }
 * @returns {{subject, html, text, skip, reason}}
 */
export function composeBrief(snapshot, { now = new Date(), dashboardPath = '' } = {}) {
  if (isRestDay(now)) {
    return { skip: true, reason: 'rest day - brief suppressed', subject: '', html: '', text: '' }
  }

  const a = analyze(snapshot, now)
  const crit = a.topActions.filter((t) => t.priority === 'critical').length
  const subject = `⚡ Morning Brief — ${MONTH[now.getMonth()]} ${now.getDate()} · ${a.topActions.length} actions${crit ? `, ${crit} critical` : ''}${a.overdue.length ? `, ${a.overdue.length} overdue` : ''}`

  return {
    skip: false,
    reason: '',
    subject,
    html: htmlBrief(snapshot, a, now, dashboardPath),
    text: textBrief(snapshot, a, now, dashboardPath),
  }
}
