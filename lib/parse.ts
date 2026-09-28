/**
 * Sheet grids → the dashboard's model. Pure: no network, no clock, no env.
 *
 * Every column is found by its header text, never by position, and a missing
 * header throws. A renamed column must stop the page with an error rather than
 * quietly print ₹0 against every team — on a dashboard people act on, a wrong
 * number that renders convincingly is the worst failure available.
 *
 * Names are printed exactly as the master writes them. Nothing here re-cases a
 * venture, a mentor or a student.
 */
import type { Cell, Grid } from './google.ts'

/** Teams that were split up and merged into others. Not counted anywhere. */
export const EXCLUDED_TEAMS: ReadonlySet<string> = new Set(['VBC104', 'VBC138'])

const TEAM_ID = /^VBC\d{3}$/

export type Channels = {
  offline: number
  online: number
  influencer: number
  performance: number
  b2b: number
}

export type Score = { value: number; outOf: number | null }

export type Checkin = {
  week: number
  preparedness: Score | null
  dataPitch: Score | null
  interpersonal: Score | null
  /** The free text, with the score lines and the "Other Notes" label taken off. */
  notes: string
}

export type Team = {
  id: string
  venture: string
  product: string
  members: string[]
  /** As typed in `Team Links`; untrusted — go through `lib/links.ts` before using as an href. */
  website: string
  instagram: string
  mentorKey: string | null
  revenue: number
  units: number
  orders: number
  newCustomers: number
  repeatOrders: number
  aov: number
  channels: Channels
  /** Proof-backed revenue by calendar day (IST date, `YYYY-MM-DD`), oldest first, sale days only. */
  daily: { date: string; revenue: number }[]
  /** Programme week → revenue, from `Weekly — by Team`. */
  weekly: Record<number, number>
  /** As the mentor sheet computes it: "On Pace", "Behind", or null when absent. */
  pace: string | null
  /** The mentor's dropdown: "Lagging", "Needs Support", "On Track", "Exceeding — Revise Target", or null. */
  assessment: string | null
  checkins: Checkin[]
}

export type Mentor = { key: string; slug: string; name: string; teamIds: string[] }

export type Dashboard = {
  teams: Team[]
  mentors: Mentor[]
  /** `current_open_week` from `TV_Cohort`: the programme week `Weekly — by Team` is counting now. */
  currentWeek: number | null
}

export type Sources = {
  teamLinks: Grid
  summary: Grid
  dailyDump: Grid
  weekly: Grid
  cohort: Grid
  /** Every mentor tab (not the Master Tracker), in any order. Rows are matched by their own Team ID. */
  mentorTabs: Grid[]
}

// ---------------------------------------------------------------- cells

export function str(c: Cell | undefined): string {
  return c === undefined || c === null ? '' : String(c).trim()
}

/** Sheet errors (`#N/A`, `#REF!`) and blanks read as absent. */
function text(c: Cell | undefined): string | null {
  const s = str(c)
  return s === '' || s.startsWith('#') ? null : s
}

export function num(c: Cell | undefined): number {
  if (typeof c === 'number') return Number.isFinite(c) ? c : 0
  const s = str(c).replace(/[₹,\s]/g, '')
  if (s === '') return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** A Sheets serial date (days since 1899-12-30) → `YYYY-MM-DD`. The sheet's clock is IST; the date part is taken as written. */
export function serialToDate(serial: number): string {
  const ms = Math.round(Math.floor(serial) * 86_400_000) + Date.UTC(1899, 11, 30)
  return new Date(ms).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------- headers

type Header = { row: number; col: (name: string) => number; has: (name: string) => boolean }

/** Finds the first row whose cells include every `required` header, within the first 15 rows. */
export function header(grid: Grid, required: string[], where: string): Header {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const cells = (grid[r] ?? []).map((c) => norm(str(c)))
    if (required.every((h) => cells.includes(norm(h)))) {
      const col = (name: string) => {
        const i = cells.indexOf(norm(name))
        if (i < 0) throw new Error(`${where}: no "${name}" column`)
        return i
      }
      return { row: r, col, has: (name) => cells.includes(norm(name)) }
    }
  }
  throw new Error(`${where}: no header row with ${required.map((h) => `"${h}"`).join(', ')}`)
}

function rows(grid: Grid, h: Header, idCol: number): { id: string; cells: Cell[] }[] {
  const out: { id: string; cells: Cell[] }[] = []
  for (let r = h.row + 1; r < grid.length; r++) {
    const cells = grid[r] ?? []
    const id = str(cells[idCol]).toUpperCase()
    if (TEAM_ID.test(id) && !EXCLUDED_TEAMS.has(id)) out.push({ id, cells })
  }
  return out
}

// ---------------------------------------------------------------- check-ins

const SCORE_LINES: [keyof Pick<Checkin, 'preparedness' | 'dataPitch' | 'interpersonal'>, RegExp][] = [
  ['preparedness', /^\s*preparedness\b[^\n]*$/im],
  ['dataPitch', /^\s*data\s*(?:&|and)\s*pitch\b[^\n]*$/im],
  ['interpersonal', /^\s*interpersonal(?:\s+skills?)?\b[^\n]*$/im],
]

function scoreOf(line: string): Score | null {
  // Everything after the label's separator: "Preparedness - 9/10" → "9/10".
  const rest = line.replace(/^[^-–:]*[-–:]/, '')
  const m = rest.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?/)
  if (!m) return null
  return { value: Number(m[1]), outOf: m[2] ? Number(m[2]) : null }
}

/**
 * One week's cell → a check-in, or null when the mentor has not written one.
 *
 * The template every cell starts from — three labels with no scores and an
 * "Other Notes" heading with nothing under it — is not a check-in. Counting it
 * as one would put a tick against every team for Week 1 whether or not anybody
 * met them.
 */
export function parseCheckin(week: number, cell: Cell | undefined): Checkin | null {
  const raw = str(cell).replace(/\r\n?/g, '\n')
  if (raw === '') return null
  let body = raw
  const c: Checkin = { week, preparedness: null, dataPitch: null, interpersonal: null, notes: '' }
  for (const [key, re] of SCORE_LINES) {
    const m = body.match(re)
    if (m) {
      c[key] = scoreOf(m[0])
      body = body.replace(m[0], '')
    }
  }
  c.notes = body
    .replace(/^\s*other\s+notes\s*:?\s*$/im, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!c.preparedness && !c.dataPitch && !c.interpersonal && c.notes === '') return null
  return c
}

// ---------------------------------------------------------------- mentors

export function mentorKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function slugOf(key: string): string {
  return key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------- the model

export function parse(src: Sources): Dashboard {
  // Roster: Team Links decides who exists, what they are called and who mentors them.
  const tlH = header(src.teamLinks, ['Team ID', 'Venture Name', 'Mentor Name'], 'Team Links')
  const roster = rows(src.teamLinks, tlH, tlH.col('Team ID'))

  // Revenue and its split.
  const sH = header(src.summary, ['Team ID', 'Revenue (proof) ₹'], 'Daily Team Summary')
  const summary = new Map(rows(src.summary, sH, sH.col('Team ID')).map((r) => [r.id, r.cells]))

  // Daily revenue, from the same proof-gated column the summary sums: Money in, on Sale rows.
  const dH = header(src.dailyDump, ['Team ID', 'Date', 'Type', 'Money in (₹)'], 'Daily Dump')
  const daily = new Map<string, Map<string, number>>()
  for (const r of rows(src.dailyDump, dH, dH.col('Team ID'))) {
    if (str(r.cells[dH.col('Type')]).toLowerCase() !== 'sale') continue
    const d = r.cells[dH.col('Date')]
    const moneyIn = num(r.cells[dH.col('Money in (₹)')])
    if (typeof d !== 'number' || moneyIn <= 0) continue
    const date = serialToDate(d)
    const byDate = daily.get(r.id) ?? new Map<string, number>()
    byDate.set(date, (byDate.get(date) ?? 0) + moneyIn)
    daily.set(r.id, byDate)
  }

  // Weekly revenue.
  const wH = header(src.weekly, ['Team ID', 'Week', 'Revenue'], 'Weekly — by Team')
  const weekly = new Map<string, Record<number, number>>()
  for (const r of rows(src.weekly, wH, wH.col('Team ID'))) {
    const w = num(r.cells[wH.col('Week')])
    if (!w) continue
    const byWeek = weekly.get(r.id) ?? {}
    byWeek[w] = (byWeek[w] ?? 0) + num(r.cells[wH.col('Revenue')])
    weekly.set(r.id, byWeek)
  }

  // Mentor tabs: pace, assessment, Wk1–Wk8 notes, matched on each row's own Team ID.
  const mentorRows = new Map<string, Cell[]>()
  const mentorHeaders = new Map<string, Header>()
  for (const grid of src.mentorTabs) {
    const h = header(grid, ['Team ID', 'Pace vs Target', 'Mentor Assessment'], 'mentor tab')
    for (const r of rows(grid, h, h.col('Team ID'))) {
      mentorRows.set(r.id, r.cells)
      mentorHeaders.set(r.id, h)
    }
  }

  const teams: Team[] = roster.map(({ id, cells }) => {
    const s = summary.get(id)
    const m = mentorRows.get(id)
    const mh = mentorHeaders.get(id)
    const mentorName = text(cells[tlH.col('Mentor Name')])

    const checkins: Checkin[] = []
    if (m && mh) {
      for (let w = 1; w <= 12; w++) {
        if (!mh.has(`Wk${w} Notes`)) continue
        const c = parseCheckin(w, m[mh.col(`Wk${w} Notes`)])
        if (c) checkins.push(c)
      }
    }

    const sCol = (name: string) => (s ? num(s[sH.col(name)]) : 0)
    return {
      id,
      venture: str(cells[tlH.col('Venture Name')]),
      product: tlH.has('Product') ? str(cells[tlH.col('Product')]) : '',
      website: tlH.has('Website Link') ? str(cells[tlH.col('Website Link')]) : '',
      instagram: tlH.has('Instagram Link') ? str(cells[tlH.col('Instagram Link')]) : '',
      members: tlH.has('Team Members')
        ? str(cells[tlH.col('Team Members')])
            .split(/\s*,\s*|\n/)
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
      mentorKey: mentorName ? mentorKey(mentorName) : null,
      revenue: sCol('Revenue (proof) ₹'),
      units: sCol('Units sold'),
      orders: sCol('Paid orders'),
      newCustomers: sCol('New cust.'),
      repeatOrders: sCol('Repeat orders'),
      aov: sCol('AOV ₹'),
      channels: {
        offline: sCol('Offline ₹'),
        online: sCol('Online / Organic ₹'),
        influencer: sCol('Affiliate / Influencer Mktg ₹'),
        performance: sCol('Performance Mktg ₹'),
        b2b: sCol('B2B ₹'),
      },
      daily: [...(daily.get(id) ?? new Map()).entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, revenue]) => ({ date, revenue })),
      weekly: weekly.get(id) ?? {},
      pace: m && mh ? text(m[mh.col('Pace vs Target')]) : null,
      assessment: m && mh ? text(m[mh.col('Mentor Assessment')]) : null,
      checkins,
    }
  })

  // Mentors: grouped ignoring case and spacing, shown in the spelling most of their rows use.
  const spellings = new Map<string, Map<string, number>>()
  for (const { cells } of roster) {
    const name = text(cells[tlH.col('Mentor Name')])
    if (!name) continue
    const k = mentorKey(name)
    const counts = spellings.get(k) ?? new Map<string, number>()
    counts.set(name, (counts.get(name) ?? 0) + 1)
    spellings.set(k, counts)
  }
  const mentors: Mentor[] = [...spellings.entries()]
    .map(([key, counts]) => ({
      key,
      slug: slugOf(key),
      name: [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0],
      teamIds: teams.filter((t) => t.mentorKey === key).map((t) => t.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // TV_Cohort is Key | Value.
  let currentWeek: number | null = null
  for (const row of src.cohort) {
    if (str(row[0]) === 'current_open_week') currentWeek = num(row[1]) || null
  }

  return { teams, mentors, currentWeek }
}
