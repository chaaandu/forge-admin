/**
 * Everything the overview computes from the model. Pure: `now` is passed in.
 */
import type { Channels, Team } from './parse.ts'

/** ₹4L per team, from the master's `Metrics` tab: "Cohort Revenue vs Cohort Target (4L*teams)". */
export const TARGET_PER_TEAM = 400_000

const IST_MS = 5.5 * 3_600_000
const DAY_MS = 86_400_000

/** Today's date in IST, `YYYY-MM-DD`. */
export function istDate(now: Date): string {
  return new Date(now.getTime() + IST_MS).toISOString().slice(0, 10)
}

function addDays(date: string, n: number): string {
  return new Date(Date.parse(date + 'T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS)
}

/**
 * The week the mentor sheet is on, counted the way its Pace formula counts:
 * `INT((TODAY() - DATE(2026,9,1)) / 7) + 1`. Check-in columns are Wk1…Wk8 on
 * the same count, so "has this team had a check-in lately" asks this number.
 */
export const MENTOR_WEEK_START = '2026-09-01'
export function mentorWeek(now: Date): number {
  return Math.floor(daysBetween(MENTOR_WEEK_START, istDate(now)) / 7) + 1
}

/** A mentor week's first and last day. Mentor weeks run Tuesday to Monday, because the sheet counts from 1 Sep. */
export function mentorWeekRange(week: number): { start: string; end: string } {
  const start = addDays(MENTOR_WEEK_START, (week - 1) * 7)
  return { start, end: addDays(start, 6) }
}

/**
 * Programme weeks, as `Weekly — by Team` counts them: Monday to Sunday from
 * Monday 31 August (the anchor in `TV_Feed!D2` and the wall's config).
 */
export const PROGRAMME_START = '2026-08-31'
export function programmeWeekRange(week: number): { start: string; end: string } {
  const start = addDays(PROGRAMME_START, (week - 1) * 7)
  return { start, end: addDays(start, 6) }
}

// ---------------------------------------------------------------- ranking

/** Revenue desc → units desc → team ID asc: the admin dashboard's and the wall's tie-break. */
export function byRevenue(a: Team, b: Team): number {
  return b.revenue - a.revenue || b.units - a.units || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export function byUnits(a: Team, b: Team): number {
  return b.units - a.units || byRevenue(a, b)
}

// ---------------------------------------------------------------- cohort

export function cohortRevenue(teams: Team[]): number {
  return teams.reduce((a, t) => a + t.revenue, 0)
}

export function cohortTarget(teams: Team[]): number {
  return TARGET_PER_TEAM * teams.length
}

/**
 * This week so far, and a like-for-like comparison with last week.
 *
 * Weeks run Monday to Sunday in IST. The comparison uses finished days only:
 * Monday-to-yesterday against the same days last week. Counting today would
 * set a morning's takings against a whole day and make every morning look
 * like a collapse. On a Monday no day is finished, so there is no comparison.
 */
export function weekSoFar(teams: Team[], now: Date) {
  const today = istDate(now)
  const daysDone = (new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7 // Monday = 0 finished days
  const monday = addDays(today, -daysDone)
  const lastMonday = addDays(monday, -7)
  let thisWeek = 0
  let thisWeekDone = 0
  let lastWeekDone = 0
  let lastWeekFull = 0
  for (const t of teams) {
    for (const d of t.daily) {
      if (d.date >= monday && d.date <= today) thisWeek += d.revenue
      if (d.date >= monday && d.date < today) thisWeekDone += d.revenue
      if (d.date >= lastMonday && d.date < addDays(lastMonday, daysDone)) lastWeekDone += d.revenue
      if (d.date >= lastMonday && d.date < monday) lastWeekFull += d.revenue
    }
  }
  return { thisWeek, thisWeekDone, lastWeekDone, lastWeekFull, daysDone, monday, sunday: addDays(monday, 6), today }
}

/** The day of the cohort's first proof-backed sale, so every daily chart shares one start. */
export function firstSaleDate(teams: Team[]): string | null {
  let first: string | null = null
  for (const t of teams) for (const d of t.daily) if (first === null || d.date < first) first = d.date
  return first
}

/**
 * Revenue per day for these teams from `from` (default: their own first sale)
 * to today, with no-sale days as zero. Pass the cohort's first sale as `from`
 * so a team's or a mentor's chart lines up with the cohort's.
 */
export function dailyCohort(teams: Team[], now: Date, from?: string | null): { date: string; revenue: number }[] {
  const byDate = new Map<string, number>()
  for (const t of teams) for (const d of t.daily) byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.revenue)
  const first = from ?? firstSaleDate(teams)
  if (!first) return []
  const today = istDate(now)
  const out: { date: string; revenue: number }[] = []
  for (let d = first; d <= today; d = addDays(d, 1)) out.push({ date: d, revenue: byDate.get(d) ?? 0 })
  return out
}

/** Labelled as the master's `Metrics` tab writes them; "0.5k" there means ₹50,000. */
export const BUCKETS = [
  { label: '0–0.5k', hint: '₹0 – ₹50,000', min: 0, max: 50_000 },
  { label: '0.5k–1L', hint: '₹50,000 – ₹1,00,000', min: 50_000, max: 100_000 },
  { label: '1L–1.5L', hint: '₹1,00,000 – ₹1,50,000', min: 100_000, max: 150_000 },
  { label: '1.5L–2L', hint: '₹1,50,000 – ₹2,00,000', min: 150_000, max: 200_000 },
  { label: '2L–2.5L', hint: '₹2,00,000 – ₹2,50,000', min: 200_000, max: 250_000 },
  { label: '>2.5L', hint: 'over ₹2,50,000', min: 250_000, max: Infinity },
] as const

export function buckets(teams: Team[]) {
  return BUCKETS.map((b) => ({ ...b, teams: teams.filter((t) => t.revenue >= b.min && t.revenue < b.max).sort(byRevenue) }))
}

export const CHANNELS: { key: keyof Channels; label: string }[] = [
  { key: 'offline', label: 'Offline' },
  { key: 'online', label: 'Online / Organic' },
  { key: 'b2b', label: 'B2B' },
  { key: 'influencer', label: 'Influencer' },
  { key: 'performance', label: 'Performance' },
]

export function channelTotals(teams: Team[]): { key: keyof Channels; label: string; revenue: number }[] {
  return CHANNELS.map((c) => ({ ...c, revenue: teams.reduce((a, t) => a + t.channels[c.key], 0) }))
}

// ---------------------------------------------------------------- attention

export function lastCheckinWeek(t: Team): number | null {
  return t.checkins.length ? Math.max(...t.checkins.map((c) => c.week)) : null
}

/** A check-in this mentor week or the one before counts as recent. */
export function hasRecentCheckin(t: Team, now: Date): boolean {
  const last = lastCheckinWeek(t)
  return last !== null && last >= mentorWeek(now) - 1
}

/**
 * Teams the mentor has flagged: Lagging first, then Needs Support, lowest revenue first.
 *
 * Only the mentor's own word puts a team here. Pace would put most of the
 * cohort on the list (most are Behind the sheet's targets), and a missing
 * check-in is a fact about the mentor rather than the team — that has its own
 * card, by mentor — so neither is allowed to bury the few teams a mentor has
 * actually raised.
 */
export function flaggedTeams(teams: Team[]): Team[] {
  const severity = (t: Team) => (t.assessment === 'Lagging' ? 0 : 1)
  return teams
    .filter((t) => t.assessment === 'Lagging' || t.assessment === 'Needs Support')
    .sort((a, b) => severity(a) - severity(b) || a.revenue - b.revenue)
}

/** Per mentor: how many of their teams have a recent check-in. */
export function checkinCoverage(teams: Team[], mentors: { key: string; name: string; slug: string }[], now: Date) {
  return mentors
    .map((m) => {
      const mine = teams.filter((t) => t.mentorKey === m.key)
      const recent = mine.filter((t) => hasRecentCheckin(t, now))
      const weeks = mine.map(lastCheckinWeek).filter((w): w is number => w !== null)
      return { mentor: m, teams: mine.length, recent: recent.length, latestWeek: weeks.length ? Math.max(...weeks) : null }
    })
    .sort((a, b) => a.recent / (a.teams || 1) - b.recent / (b.teams || 1) || a.mentor.name.localeCompare(b.mentor.name))
}

// ---------------------------------------------------------------- per team, per mentor

/** 1-based rank of every team by revenue, with the standard tie-break. */
export function ranks(teams: Team[]): Map<string, number> {
  return new Map([...teams].sort(byRevenue).map((t, i) => [t.id, i + 1]))
}

export type MentorSummary = {
  mentor: { key: string; slug: string; name: string }
  teams: Team[]
  revenue: number
  average: number
  thisWeek: number
  thisWeekDone: number
  lastWeekDone: number
  daysDone: number
  onPace: number
  flagged: number
  recent: number
  latestWeek: number | null
}

export function mentorSummary(mentor: { key: string; slug: string; name: string }, all: Team[], now: Date): MentorSummary {
  const teams = all.filter((t) => t.mentorKey === mentor.key).sort(byRevenue)
  const revenue = cohortRevenue(teams)
  const week = weekSoFar(teams, now)
  const weeks = teams.map(lastCheckinWeek).filter((w): w is number => w !== null)
  return {
    mentor,
    teams,
    revenue,
    average: teams.length ? revenue / teams.length : 0,
    thisWeek: week.thisWeek,
    thisWeekDone: week.thisWeekDone,
    lastWeekDone: week.lastWeekDone,
    daysDone: week.daysDone,
    onPace: teams.filter((t) => t.pace === 'On Pace').length,
    flagged: flaggedTeams(teams).length,
    recent: teams.filter((t) => hasRecentCheckin(t, now)).length,
    latestWeek: weeks.length ? Math.max(...weeks) : null,
  }
}

// ---------------------------------------------------------------- check-in history

/** For each team, which mentor weeks 1…through have a check-in written. */
export function checkinGrid(teams: Team[], through: number) {
  const weeks = Array.from({ length: Math.max(0, through) }, (_, i) => i + 1)
  return {
    weeks,
    rows: teams.map((t) => ({ team: t, cells: weeks.map((w) => t.checkins.find((c) => c.week === w) ?? null) })),
  }
}

/** For each mentor, how many of their teams have a check-in in each week 1…through. */
export function mentorCheckinGrid(teams: Team[], mentors: { key: string; name: string; slug: string }[], through: number) {
  const weeks = Array.from({ length: Math.max(0, through) }, (_, i) => i + 1)
  return {
    weeks,
    rows: mentors.map((m) => {
      const mine = teams.filter((t) => t.mentorKey === m.key)
      return { mentor: m, teams: mine.length, cells: weeks.map((w) => mine.filter((t) => t.checkins.some((c) => c.week === w)).length) }
    }),
  }
}
