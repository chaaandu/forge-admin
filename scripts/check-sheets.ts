/**
 * Step 1's proof: the service account can read both sheets live, and the parser
 * makes sense of what comes back.
 *
 *     npm run check-sheets
 */
import { listTabs, readTabs } from '../lib/google.ts'
import { parse } from '../lib/parse.ts'
import { MASTER_TABS, mentorTabTitles, toSources } from '../lib/tabs.ts'

const master = process.env.MASTER_SHEET_ID
const mentor = process.env.MENTOR_SHEET_ID
if (!master || !mentor) {
  console.error('Set MASTER_SHEET_ID and MENTOR_SHEET_ID in .env.local')
  process.exit(1)
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

const masterTabs = await listTabs(master)
console.log(`BYOB_MASTER: ${masterTabs.length} tabs`)
const mentorTabs = await listTabs(mentor)
const titles = mentorTabTitles(mentorTabs)
console.log(`Mentor sheet: ${mentorTabs.length} tabs, reading ${titles.length} mentor tabs: ${titles.join(', ')}`)

const [m, t] = await Promise.all([readTabs(master, Object.values(MASTER_TABS)), readTabs(mentor, titles)])
const d = parse(toSources(m, t, titles))

const total = d.teams.reduce((a, x) => a + x.revenue, 0)
console.log(`\n${d.teams.length} teams, ${d.mentors.length} mentors, cohort revenue ${inr(total)}, current week ${d.currentWeek}`)
for (const mt of d.mentors) {
  const teams = d.teams.filter((x) => x.mentorKey === mt.key)
  const checked = teams.filter((x) => x.checkins.length > 0).length
  console.log(`  ${mt.name.padEnd(18)} ${String(teams.length).padStart(2)} teams  ${inr(teams.reduce((a, x) => a + x.revenue, 0)).padStart(12)}  ${checked} with check-ins`)
}
const unmatched = d.teams.filter((x) => x.pace === null && x.assessment === null)
if (unmatched.length) console.log(`\nNot on any mentor tab: ${unmatched.map((x) => x.id).join(', ')}`)
