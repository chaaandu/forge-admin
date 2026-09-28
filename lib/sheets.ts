/**
 * The app's one way to get data: both sheets, read live, parsed, held for 60
 * seconds so a burst of page loads is one set of Google requests rather than one each.
 *
 * `server-only` makes the build fail if a client component ever imports this,
 * which is what keeps the service account key and the mentor notes off the browser.
 */
import 'server-only'
import { listTabs, readTabs } from './google.ts'
import { parse, type Dashboard } from './parse.ts'
import { MASTER_TABS, mentorTabTitles, toSources } from './tabs.ts'

const TTL_MS = 60_000

/** The model plus when it was read, so every page can say how fresh it is. */
export type LiveDashboard = Dashboard & { readAt: number }

let cached: { at: number; data: Promise<LiveDashboard> } | null = null

function ids() {
  const master = process.env.MASTER_SHEET_ID
  const mentor = process.env.MENTOR_SHEET_ID
  if (!master || !mentor) throw new Error('MASTER_SHEET_ID and MENTOR_SHEET_ID must be set (see .env.example)')
  return { master, mentor }
}

async function load(): Promise<LiveDashboard> {
  const { master, mentor } = ids()
  const mentorTitles = mentorTabTitles(await listTabs(mentor))
  const [m, t] = await Promise.all([
    readTabs(master, Object.values(MASTER_TABS)),
    readTabs(mentor, mentorTitles),
  ])
  return { ...parse(toSources(m, t, mentorTitles)), readAt: Date.now() }
}

export function getDashboard(): Promise<LiveDashboard> {
  const now = Date.now()
  if (!cached || now - cached.at > TTL_MS) {
    const data = load()
    cached = { at: now, data }
    // A failed read must not be served for the next minute; the next request retries.
    data.catch(() => {
      if (cached?.data === data) cached = null
    })
  }
  return cached.data
}
