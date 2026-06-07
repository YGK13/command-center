// ============================================================
// screenshots.mjs — capture dashboard screenshots for the guide.
// Uses puppeteer-core driving the Chrome already installed on the
// machine (no Chromium download). Renders index.html via file://,
// clicks through each tab and saves PNGs to teaching/assets/.
//
//   node setup/screenshots.mjs
// ============================================================

import puppeteer from 'puppeteer-core'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'teaching', 'assets')
fs.mkdirSync(OUT, { recursive: true })

// Find an installed browser
const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const executablePath = CANDIDATES.find((p) => fs.existsSync(p))
if (!executablePath) { console.error('No Chrome/Edge found'); process.exit(1) }

const fileUrl = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/')

const SHOTS = [
  { view: 'portfolio', file: '01-portfolio.png' },
  { view: 'pipeline',  file: '02-pipeline.png' },
  { view: 'okrs',      file: '03-okrs.png' },
  { view: 'tasks',     file: '04-tasks.png' },
  { view: 'feeds',     file: '05-feeds.png' },
  { view: 'builds',    file: '06-builds.png' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  defaultViewport: { width: 1440, height: 950, deviceScaleFactor: 2 },
  args: ['--allow-file-access-from-files', '--hide-scrollbars'],
})

try {
  const page = await browser.newPage()
  await page.goto(fileUrl, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.nav', { timeout: 8000 })
  await sleep(400)

  for (const shot of SHOTS) {
    await page.evaluate((v) => {
      const btn = document.querySelector(`[data-act="tab"][data-view="${v}"]`)
      if (btn) btn.click()
    }, shot.view)
    await sleep(600)
    await page.screenshot({ path: path.join(OUT, shot.file), fullPage: false })
    console.log('captured', shot.file)
  }

  // Also grab the deal-edit modal for the walkthrough
  await page.evaluate(() => {
    const btn = document.querySelector('[data-act="tab"][data-view="pipeline"]')
    if (btn) btn.click()
  })
  await sleep(400)
  await page.evaluate(() => {
    const add = document.querySelector('[data-act="add-deal"]')
    if (add) add.click()
  })
  await sleep(400)
  await page.screenshot({ path: path.join(OUT, '07-deal-modal.png'), fullPage: false })
  console.log('captured 07-deal-modal.png')
} finally {
  await browser.close()
}
console.log('Done. Screenshots in teaching/assets/')
