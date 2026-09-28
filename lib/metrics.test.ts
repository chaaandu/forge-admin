import { describe, expect, it } from 'vitest'
import {
  buckets,
  byRevenue,
  checkinCoverage,
  dailyCohort,
  flaggedTeams,
  hasRecentCheckin,
  istDate,
  checkinGrid,
  mentorCheckinGrid,
  mentorSummary,
  mentorWeek,
  mentorWeekRange,
  programmeWeekRange,
  ranks,
  weekSoFar,
} from './metrics.ts'
import type { Team } from './parse.ts'

function team(id: string, over: Partial<Team> = {}): Team {
  return {
    id,
    venture: id,
    product: '',
    members: [],
    website: '',
    instagram: '',
    mentorKey: 'm',
    revenue: 0,
    units: 0,
    orders: 0,
    newCustomers: 0,
    repeatOrders: 0,
    aov: 0,
    channels: { offline: 0, online: 0, influencer: 0, performance: 0, b2b: 0 },
    daily: [],
    weekly: {},
    pace: null,
    assessment: null,
    checkins: [],
    ...over,
  }
}

// Wednesday 30 September 2026, 10:00 IST.
const WED = new Date('2026-09-30T04:30:00Z')

describe('dates', () => {
  it('reads today in IST, not UTC', () => {
    // 00:30 IST on 1 Oct is still 30 Sep in UTC.
    expect(istDate(new Date('2026-09-30T19:00:00Z'))).toBe('2026-10-01')
  })

  it('counts mentor weeks from 1 September, as the sheet does', () => {
    expect(mentorWeek(new Date('2026-09-01T06:00:00Z'))).toBe(1)
    expect(mentorWeek(new Date('2026-09-07T06:00:00Z'))).toBe(1)
    expect(mentorWeek(new Date('2026-09-08T06:00:00Z'))).toBe(2)
    expect(mentorWeek(new Date('2026-09-28T06:00:00Z'))).toBe(4)
  })
})

describe('ranking', () => {
  it('breaks revenue ties on units, then team ID', () => {
    const t = [team('VBC103', { revenue: 10, units: 1 }), team('VBC102', { revenue: 10, units: 5 }), team('VBC101', { revenue: 10, units: 1 })]
    expect(t.sort(byRevenue).map((x) => x.id)).toEqual(['VBC102', 'VBC101', 'VBC103'])
  })
})

describe('weekSoFar', () => {
  const t = team('VBC101', {
    daily: [
      { date: '2026-09-21', revenue: 100 }, // last Mon
      { date: '2026-09-22', revenue: 20 }, // last Tue
      { date: '2026-09-23', revenue: 10 }, // last Wed: same weekday as today, not finished-days
      { date: '2026-09-24', revenue: 1000 }, // last Thu
      { date: '2026-09-28', revenue: 5 }, // this Mon
      { date: '2026-09-30', revenue: 7 }, // today
    ],
  })

  it('compares finished days only, so a morning is never set against a whole day', () => {
    expect(weekSoFar([t], WED)).toEqual({
      thisWeek: 12,
      thisWeekDone: 5,
      lastWeekDone: 120,
      lastWeekFull: 1130,
      daysDone: 2,
      monday: '2026-09-28',
      sunday: '2026-10-04',
      today: '2026-09-30',
    })
  })

  it('has nothing to compare on a Monday', () => {
    const mon = weekSoFar([t], new Date('2026-09-28T06:00:00Z'))
    expect(mon).toMatchObject({ thisWeek: 5, daysDone: 0, thisWeekDone: 0, lastWeekDone: 0, lastWeekFull: 1130 })
  })
})

describe('dailyCohort', () => {
  it('fills quiet days with zero up to today', () => {
    const a = team('VBC101', { daily: [{ date: '2026-09-27', revenue: 5 }] })
    const b = team('VBC102', { daily: [{ date: '2026-09-27', revenue: 3 }, { date: '2026-09-29', revenue: 1 }] })
    expect(dailyCohort([a, b], WED)).toEqual([
      { date: '2026-09-27', revenue: 8 },
      { date: '2026-09-28', revenue: 0 },
      { date: '2026-09-29', revenue: 1 },
      { date: '2026-09-30', revenue: 0 },
    ])
  })
})

describe('buckets', () => {
  it('puts a boundary figure in the higher bucket', () => {
    const b = buckets([team('A', { revenue: 49_999 }), team('B', { revenue: 50_000 }), team('C', { revenue: 300_000 })])
    expect(b.map((x) => x.teams.map((t) => t.id))).toEqual([['A'], ['B'], [], [], [], ['C']])
  })
})

const cin = (week: number) => ({ week, preparedness: null, dataPitch: null, interpersonal: null, notes: 'x' })

describe('flaggedTeams', () => {
  it('lists only teams the mentor flagged, Lagging first, lowest revenue first', () => {
    const list = flaggedTeams([
      team('FINE', { assessment: 'On Track', pace: 'Behind' }),
      team('HELP', { assessment: 'Needs Support', revenue: 5 }),
      team('LAG2', { assessment: 'Lagging', revenue: 9 }),
      team('LAG1', { assessment: 'Lagging', revenue: 1 }),
      team('NONE', { assessment: null }),
    ])
    expect(list.map((t) => t.id)).toEqual(['LAG1', 'LAG2', 'HELP'])
  })
})

describe('check-ins', () => {
  // 30 Sep is mentor week 5, so week 4 or 5 counts as recent.
  it('counts this week or last as recent', () => {
    expect(hasRecentCheckin(team('A', { checkins: [cin(5)] }), WED)).toBe(true)
    expect(hasRecentCheckin(team('A', { checkins: [cin(4)] }), WED)).toBe(true)
    expect(hasRecentCheckin(team('A', { checkins: [cin(1), cin(3)] }), WED)).toBe(false)
    expect(hasRecentCheckin(team('A'), WED)).toBe(false)
  })

  it('reports coverage per mentor, worst first', () => {
    const mentors = [
      { key: 'a', name: 'A', slug: 'a' },
      { key: 'b', name: 'B', slug: 'b' },
    ]
    const cov = checkinCoverage(
      [
        team('1', { mentorKey: 'a', checkins: [cin(5)] }),
        team('2', { mentorKey: 'a', checkins: [cin(5)] }),
        team('3', { mentorKey: 'b', checkins: [cin(2)] }),
        team('4', { mentorKey: 'b' }),
      ],
      mentors,
      WED,
    )
    expect(cov.map((c) => [c.mentor.name, c.recent, c.teams, c.latestWeek])).toEqual([
      ['B', 0, 2, 2],
      ['A', 2, 2, 5],
    ])
  })
})

describe('per mentor', () => {
  it('summarises one mentor’s teams and nobody else’s', () => {
    const teams = [
      team('A1', { mentorKey: 'a', revenue: 100, pace: 'On Pace', assessment: 'Lagging', checkins: [cin(5)] }),
      team('A2', { mentorKey: 'a', revenue: 300, pace: 'Behind', assessment: 'On Track' }),
      team('B1', { mentorKey: 'b', revenue: 999, pace: 'On Pace' }),
    ]
    const s = mentorSummary({ key: 'a', slug: 'a', name: 'A' }, teams, WED)
    expect(s.teams.map((t) => t.id)).toEqual(['A2', 'A1'])
    expect(s).toMatchObject({ revenue: 400, average: 200, onPace: 1, flagged: 1, recent: 1, latestWeek: 5 })
  })

  it('ranks the whole cohort once', () => {
    const r = ranks([team('X', { revenue: 1 }), team('Y', { revenue: 5 })])
    expect([r.get('Y'), r.get('X')]).toEqual([1, 2])
  })

  it('starts a team’s daily chart on the cohort’s first sale', () => {
    const a = team('A', { daily: [{ date: '2026-09-29', revenue: 4 }] })
    expect(dailyCohort([a], WED, '2026-09-28').map((d) => d.date)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30'])
  })
})

describe('week ranges', () => {
  it('mentor weeks run Tuesday to Monday from 1 Sep', () => {
    expect(mentorWeekRange(1)).toEqual({ start: '2026-09-01', end: '2026-09-07' })
    expect(mentorWeekRange(4)).toEqual({ start: '2026-09-22', end: '2026-09-28' })
  })

  it('programme weeks run Monday to Sunday from 31 Aug', () => {
    expect(programmeWeekRange(1)).toEqual({ start: '2026-08-31', end: '2026-09-06' })
    expect(programmeWeekRange(4)).toEqual({ start: '2026-09-21', end: '2026-09-27' })
  })
})

describe('check-in history', () => {
  it('marks which weeks each team has notes for', () => {
    const g = checkinGrid([team('A', { checkins: [cin(1), cin(3)] })], 4)
    expect(g.weeks).toEqual([1, 2, 3, 4])
    expect(g.rows[0].cells.map((c) => c?.week ?? null)).toEqual([1, null, 3, null])
  })

  it('counts each mentor’s teams with notes per week', () => {
    const g = mentorCheckinGrid(
      [team('1', { mentorKey: 'a', checkins: [cin(1)] }), team('2', { mentorKey: 'a', checkins: [cin(1), cin(2)] })],
      [{ key: 'a', name: 'A', slug: 'a' }],
      3,
    )
    expect(g.rows[0]).toMatchObject({ teams: 2, cells: [2, 1, 0] })
  })
})
