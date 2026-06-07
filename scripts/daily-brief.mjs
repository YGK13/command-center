// ============================================================
// DAILY-BRIEF — the morning engine. This is what Windows Task
// Scheduler runs each morning. It:
//   1. Refreshes the dashboard data snapshot (fetches live feeds,
//      reads your latest notes digest) → writes ../data.js
//   2. Composes the morning brief (rest-day aware)
//   3. Emails it via Gmail SMTP
//
// Flags:
//   --no-email   refresh data + print the brief, but do not send
//   --no-fetch   skip feed fetching (use cached/last data)
//   --verify     just verify SMTP credentials and exit
//
// Exit codes: 0 success (or intentionally skipped), 1 failure.
// ============================================================

import './env.mjs'
import path from 'node:path'
import { ROOT } from './env.mjs'
import { buildData } from './build-data.mjs'
import { composeBrief } from './brief.mjs'
import { sendBrief, verifyEmail, hasEmailConfig } from './email.mjs'

const args = new Set(process.argv.slice(2))
const noEmail = args.has('--no-email')
const noFetch = args.has('--no-fetch')
const verifyOnly = args.has('--verify')

const log = (...a) => console.log('[brief]', ...a)

async function main() {
  // --verify: check SMTP creds and exit
  if (verifyOnly) {
    if (!hasEmailConfig()) {
      console.error('✗ No email config. Copy .env.example → .env and fill GMAIL_USER / GMAIL_APP_PASSWORD.')
      process.exit(1)
    }
    await verifyEmail()
    log('✓ SMTP credentials verified — Gmail is ready.')
    return
  }

  // 1. Refresh the dashboard data snapshot
  log(noFetch ? 'Building data (no feed fetch)…' : 'Building data + fetching live feeds…')
  const { snapshot } = await buildData({ fetchFeeds: !noFetch })
  const feedSummary = Object.values(snapshot.feeds || {})
    .map((f) => `${f.label}:${f.items.length}${f.error ? '(' + f.error + ')' : ''}`)
    .join('  ')
  log('Data written → data.js   Feeds:', feedSummary || '(none)')
  log('KB digest:', snapshot.digest ? snapshot.digest.filename : '(none found)')

  // 2. Compose the brief
  const dashboardPath = path.join(ROOT, 'index.html')
  const brief = composeBrief(snapshot, { now: new Date(), dashboardPath })

  if (brief.skip) {
    log('Rest day - brief suppressed (' + brief.reason + '). Data still refreshed.')
    return
  }

  log('Subject:', brief.subject)

  // 3. Send (unless --no-email)
  if (noEmail) {
    log('--no-email set: not sending. Plaintext preview below:')
    console.log('\n' + '─'.repeat(64) + '\n' + brief.text + '\n' + '─'.repeat(64) + '\n')
    return
  }

  if (!hasEmailConfig()) {
    console.error('✗ Email not configured. Copy .env.example → .env and add Gmail credentials.')
    console.error('  (Data was still refreshed — the dashboard is up to date.)')
    process.exit(1)
  }

  const info = await sendBrief(brief)
  log('✓ Email sent →', process.env.BRIEF_TO || process.env.GMAIL_USER, '   id:', info.messageId)
}

main().catch((err) => {
  console.error('[brief] ✗ Failed:', err.message)
  process.exit(1)
})
