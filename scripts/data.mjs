// ============================================================
// DATA — your business, as plain data (the single source of truth)
// This is the ONLY file you edit day to day. Everything reads from it.
// The sample below is a fictional demo. Replace it with your own.
// ============================================================

// ---- COMPANIES / PROJECTS / SERVICE LINES --------------------
export const COMPANIES = [
  {
    id: 'consulting',                 // short, lowercase, never change it
    name: 'Acme Consulting',
    emoji: '🎯',
    tagline: 'Fractional operations practice',
    color: '#0ea5e9',
    health: 60,                       // 0-100, your honest gut score
    revenueLabel: 'MRR',
    revenueCurrent: 4000,
    revenueTarget: 12500,
    pipelineCount: 3,
    pipelineValue: 165000,
    focusAction: 'Send the Series B proposal you keep putting off',
    kpis: [
      { label: 'Pipeline', value: '$165K' },
      { label: 'Top deal', value: 'Series B SaaS' },
      { label: 'Target MRR', value: '$12.5K' },
      { label: 'Clients', value: '2 active' },
    ],
    notes: '',
  },
  {
    id: 'product',
    name: 'Widget App',
    emoji: '🧩',
    tagline: 'Micro-SaaS side product',
    color: '#22c55e',
    health: 48,
    revenueLabel: 'MRR',
    revenueCurrent: 320,
    revenueTarget: 3000,
    pipelineCount: 0,
    pipelineValue: 0,
    focusAction: 'Ship the onboarding email so trials convert',
    kpis: [
      { label: 'MRR', value: '$320' },
      { label: 'Trials', value: '14 active' },
      { label: 'Conversion', value: '6%' },
      { label: 'Target', value: '$3K MRR' },
    ],
    notes: '',
  },
  {
    id: 'newsletter',
    name: 'The Friday Memo',
    emoji: '✉️',
    tagline: 'Audience + thought leadership',
    color: '#a855f7',
    health: 70,
    revenueLabel: 'Subscribers',
    revenueCurrent: 1200,
    revenueTarget: 5000,
    pipelineCount: 0,
    pipelineValue: 0,
    focusAction: 'Batch next month of issues this weekend',
    kpis: [
      { label: 'Subscribers', value: '1,200' },
      { label: 'Open rate', value: '52%' },
      { label: 'Cadence', value: 'Weekly' },
      { label: 'Goal', value: '5,000' },
    ],
    notes: '',
  },
  {
    id: 'advisory',
    name: 'Advisory Practice',
    emoji: '🧭',
    tagline: 'Board + fractional advisory',
    color: '#f97316',
    health: 72,
    revenueLabel: 'Q Revenue',
    revenueCurrent: 9000,
    revenueTarget: 30000,
    pipelineCount: 2,
    pipelineValue: 72000,
    focusAction: 'Convert the two warm intros into calls',
    kpis: [
      { label: 'Retainers', value: '1 active' },
      { label: 'Pipeline', value: '$72K' },
      { label: 'Rate', value: '$6K/mo' },
      { label: 'Q Revenue', value: '$9K' },
    ],
    notes: '',
  },
]

// ---- PIPELINE DEALS (the kanban cards) -----------------------
export const PIPELINE_DEALS_DEFAULT = [
  { id: 'd1', company: 'consulting', name: 'Series B SaaS — ops pilot', value: 84000, stage: 'proposal',  nextAction: 'Send the proposal and pricing', dueDate: '2026-06-15' },
  { id: 'd2', company: 'consulting', name: 'Manufacturer — process audit', value: 45000, stage: 'qualified', nextAction: 'Book the discovery call', dueDate: '2026-06-20' },
  { id: 'd3', company: 'consulting', name: 'Agency — retainer', value: 36000, stage: 'warm', nextAction: 'Re-send the one-pager', dueDate: '2026-06-25' },
  { id: 'd4', company: 'advisory', name: 'PE fund — advisory seat', value: 48000, stage: 'warm', nextAction: 'Intro call confirmed, prep scope', dueDate: '2026-06-18' },
  { id: 'd5', company: 'advisory', name: 'Startup — board advisor', value: 24000, stage: 'cold', nextAction: 'Referral intro, qualify first', dueDate: '2026-06-30' },
  { id: 'd6', company: 'consulting', name: 'Existing client — renewal', value: 24000, stage: 'closed', nextAction: 'Send renewal + upsell', dueDate: '2026-06-12' },
]

// ---- GOALS / OKRs --------------------------------------------
export const OKRS_DEFAULT = [
  {
    company: 'consulting',
    objective: 'Land the next pilot and reach $12.5K MRR',
    krs: [
      { label: 'Discovery calls', current: 2, target: 6 },
      { label: 'Proposals sent', current: 1, target: 3 },
      { label: 'MRR', current: 4000, target: 12500, format: 'currency' },
    ],
  },
  {
    company: 'product',
    objective: 'Get the product to $3K MRR',
    krs: [
      { label: 'Trial-to-paid %', current: 6, target: 15 },
      { label: 'Active trials', current: 14, target: 40 },
      { label: 'MRR', current: 320, target: 3000, format: 'currency' },
    ],
  },
  {
    company: 'newsletter',
    objective: 'Grow to 5,000 engaged subscribers',
    krs: [
      { label: 'Subscribers', current: 1200, target: 5000 },
      { label: 'Issues shipped this Q', current: 4, target: 12 },
      { label: 'Open rate %', current: 52, target: 55 },
    ],
  },
  {
    company: 'advisory',
    objective: 'Add a second advisory retainer',
    krs: [
      { label: 'Intro conversations', current: 3, target: 8 },
      { label: 'Active retainers', current: 1, target: 2 },
      { label: 'Q revenue', current: 9000, target: 30000, format: 'currency' },
    ],
  },
]

// ---- TASKS ---------------------------------------------------
export const TASKS_DEFAULT = [
  { id: 't1', priority: 'critical', company: 'consulting', title: 'Send the Series B proposal — it is the biggest deal in the pipeline', category: 'Sales',    done: false, dueDate: 'Today',  dueISO: '2026-06-09' },
  { id: 't2', priority: 'critical', company: 'product',    title: 'Ship the trial onboarding email sequence', category: 'Build',    done: false, dueDate: 'Today',  dueISO: '2026-06-09' },
  { id: 't3', priority: 'high',     company: 'advisory',   title: 'Prep the PE fund advisory scope before the intro call', category: 'Sales',    done: false, dueDate: 'Jun 11', dueISO: '2026-06-11' },
  { id: 't4', priority: 'high',     company: 'newsletter', title: 'Draft next two newsletter issues', category: 'Content',  done: false, dueDate: 'Jun 12', dueISO: '2026-06-12' },
  { id: 't5', priority: 'high',     company: 'consulting', title: 'Re-qualify the agency retainer lead', category: 'Sales',    done: false, dueDate: 'Jun 13', dueISO: '2026-06-13' },
  { id: 't6', priority: 'medium',   company: 'product',    title: 'Add a pricing page FAQ', category: 'Build',    done: false, dueDate: 'Jun 16', dueISO: '2026-06-16' },
  { id: 't7', priority: 'medium',   company: 'newsletter', title: 'Repurpose last issue into a LinkedIn post', category: 'Content',  done: false, dueDate: 'Jun 16', dueISO: '2026-06-16' },
  { id: 't8', priority: 'medium',   company: 'advisory',   title: 'Send quarterly update to current retainer client', category: 'Outreach', done: false, dueDate: 'Jun 18', dueISO: '2026-06-18' },
]

// ---- BACKGROUND SYSTEMS (optional; leave [] if none) ---------
export const BUILD_STATUS = [
  { company: 'system', label: 'Morning brief engine', jobs: 1, port: '-', lastRun: 'auto', nextRun: 'Daily 07:00', status: 'active' },
]

// ---- PIPELINE STAGES (the kanban columns) --------------------
export const STAGES = [
  { key: 'cold',      label: 'Cold',      color: '#3d5068' },
  { key: 'warm',      label: 'Warm',      color: '#f97316' },
  { key: 'qualified', label: 'Qualified', color: '#0ea5e9' },
  { key: 'proposal',  label: 'Proposal',  color: '#a855f7' },
  { key: 'closed',    label: 'Closed',    color: '#22c55e' },
]

// ---- NEWS FEEDS (your daily intelligence) --------------------
// Tip: a Google News RSS search is the easiest source. Take
// https://news.google.com/rss/search?q=  and add your terms with +.
export const FEED_SOURCES = [
  { id: 'industry', label: 'My Industry', color: '#0ea5e9',
    url: 'https://news.google.com/rss/search?q=small+business+strategy&hl=en-US&gl=US&ceid=US:en',
    description: 'What is moving in my market' },
  { id: 'ai', label: 'AI for Business', color: '#a855f7',
    url: 'https://news.google.com/rss/search?q=AI+for+small+business&hl=en-US&gl=US&ceid=US:en',
    description: 'AI tools and tactics I can use' },
  { id: 'tech', label: 'Tech & Funding', color: '#22c55e',
    url: 'https://techcrunch.com/feed/',
    description: 'TechCrunch — funding, products, exits' },
]

// ---- UTILITY HELPERS (no need to edit) -----------------------
export const companyShort = (id) => {
  const c = COMPANIES.find((x) => x.id === id)
  if (!c) return id
  return c.name.length > 16 ? c.name.slice(0, 14) + '…' : c.name
}
export const companyColor = (id) => {
  const c = COMPANIES.find((x) => x.id === id)
  return c ? c.color : '#7b8fa8'
}
export const healthClass = (s) => (s >= 70 ? 'green' : s >= 50 ? 'yellow' : 'red')
export const fmt = (v) => {
  v = Number(v) || 0
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
  return `$${v}`
}
export const nanoid = () => Math.random().toString(36).slice(2, 10)
