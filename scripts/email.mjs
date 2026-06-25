// ============================================================
// EMAIL — Gmail SMTP transport via nodemailer.
// Credentials come from .env (loaded by env.mjs):
//   GMAIL_USER           your full gmail address
//   GMAIL_APP_PASSWORD   16-char Google App Password (NOT your login pw)
//   BRIEF_TO             optional override recipient (defaults to GMAIL_USER)
// ============================================================

import nodemailer from 'nodemailer'
import dns from 'node:dns'

// Some machines/networks have no working IPv6 route to Gmail, and Node
// tries IPv6 first by default, which hangs until timeout. Force IPv4.
try { dns.setDefaultResultOrder('ipv4first') } catch (_) {}

export function hasEmailConfig() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

export function makeTransport() {
  const user = process.env.GMAIL_USER
  // Google shows app passwords spaced ("abcd efgh ijkl mnop") for
  // readability, but SMTP wants the 16 chars with NO spaces. Strip them.
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '')
  if (!user || !pass) {
    throw new Error(
      'Missing GMAIL_USER / GMAIL_APP_PASSWORD in .env — copy .env.example to .env and fill them in.'
    )
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    family: 4,               // force IPv4 (the IPv6 route to Gmail can time out)
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
  })
}

/**
 * Send the brief. Returns nodemailer info.
 */
export async function sendBrief({ subject, html, text }) {
  const transport = makeTransport()
  const from = process.env.GMAIL_USER
  const to = process.env.BRIEF_TO || from
  return transport.sendMail({
    from: `Command Center <${from}>`,
    to,
    subject,
    text,
    html,
  })
}

/**
 * Verify SMTP credentials without sending. Returns true/throws.
 */
export async function verifyEmail() {
  const transport = makeTransport()
  await transport.verify()
  return true
}
