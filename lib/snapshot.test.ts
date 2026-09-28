/**
 * The parser run on real downloaded copies of both sheets.
 * Skipped when fixtures/ is absent — run `npm run fixtures` to build it.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Grid, Tab } from './google.ts'
import { EXCLUDED_TEAMS, header, num, parse, str } from './parse.ts'
import { mentorTabTitles, toSources } from './tabs.ts'

type Fixture = { tabs: Tab[]; grids: Record<string, Grid> }
const dir = join(__dirname, '..', 'fixtures')
const have = existsSync(join(dir, 'master.json')) && existsSync(join(dir, 'mentor.json'))
const load = (f: string): Fixture => JSON.parse(readFileSync(join(dir, f), 'utf8'))

describe.skipIf(!have)('real sheets', () => {
  const master = have ? load('master.json') : ({} as Fixture)
  const mentor = have ? load('mentor.json') : ({} as Fixture)
  const titles = have ? mentorTabTitles(mentor.tabs) : []
  const d = have ? parse(toSources(master.grids, mentor.grids, titles)) : ({} as ReturnType<typeof parse>)

  it('finds exactly the competing teams', () => {
    expect(d.teams.length).toBe(37)
    for (const id of EXCLUDED_TEAMS) expect(d.teams.map((t) => t.id)).not.toContain(id)
  })

  it('the daily figures add up to each team’s proof-backed total', () => {
    for (const t of d.teams) {
      const sum = t.daily.reduce((a, x) => a + x.revenue, 0)
      expect(Math.abs(sum - t.revenue), t.id).toBeLessThan(1)
    }
  })

  it('the teams add up to the summary’s own total row', () => {
    const g = master.grids['Daily Team Summary']
    const h = header(g, ['Team ID', 'Revenue (proof) ₹'], 'summary')
    const totalRow = g.slice(h.row + 1).find((r) => str(r[0]) === '')!
    const total = num(totalRow[h.col('Revenue (proof) ₹')])
    const ours = d.teams.reduce((a, t) => a + t.revenue, 0)
    expect(Math.abs(ours - total)).toBeLessThan(1)
  })

  it('every team is on a mentor tab and has a mentor', () => {
    for (const t of d.teams) {
      expect(t.pace, t.id).not.toBeNull()
      expect(t.assessment, t.id).not.toBeNull()
      expect(t.mentorKey, t.id).not.toBeNull()
    }
  })

  it('six mentors, every team under exactly one', () => {
    expect(d.mentors.length).toBe(6)
    const ids = d.mentors.flatMap((m) => m.teamIds)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(d.teams.length)
  })

  it('reads the mentors’ scores where they wrote them', () => {
    const vbc108 = d.teams.find((t) => t.id === 'VBC108')!
    expect(vbc108.checkins[0].preparedness).toEqual({ value: 9, outOf: 10 })
  })
})
