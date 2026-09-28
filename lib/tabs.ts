/**
 * Which tabs are read, in one place, so the live reader and the snapshot tests
 * cannot come to read different things.
 *
 * `Team Details` is deliberately absent: it carries students' phone numbers and
 * emails, and nothing on this dashboard needs them.
 */
import type { Grid, Tab } from './google.ts'
import type { Sources } from './parse.ts'

export const MASTER_TABS = {
  teamLinks: 'Team Links',
  summary: 'Daily Team Summary',
  dailyDump: 'Daily Dump',
  weekly: 'Weekly — by Team',
  cohort: 'TV_Cohort',
} as const

/** The mentor sheet's roll-up. Everything on it is copied from the mentor tabs, so it is not read. */
const MENTOR_ROLLUP = 'Master Tracker'

/**
 * A mentor tab is any visible tab other than the roll-up. New mentors get a new
 * tab and appear without a code change; whether a tab really is a mentor tab is
 * decided by its header row in `parse`, which throws on one that is not.
 */
export function mentorTabTitles(tabs: Tab[]): string[] {
  return tabs.filter((t) => !t.hidden && t.title !== MENTOR_ROLLUP).map((t) => t.title)
}

export function toSources(master: Record<string, Grid>, mentor: Record<string, Grid>, mentorTitles: string[]): Sources {
  const need = (name: string) => {
    const g = master[name]
    if (!g) throw new Error(`BYOB_MASTER: no "${name}" tab`)
    return g
  }
  return {
    teamLinks: need(MASTER_TABS.teamLinks),
    summary: need(MASTER_TABS.summary),
    dailyDump: need(MASTER_TABS.dailyDump),
    weekly: need(MASTER_TABS.weekly),
    cohort: need(MASTER_TABS.cohort),
    mentorTabs: mentorTitles.map((t) => mentor[t] ?? []),
  }
}
