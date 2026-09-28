import { describe, expect, it } from 'vitest'
import type { Team } from './parse.ts'
import { matches, parseSort, sortRows, teamRows } from './teamRows.ts'

const t = (id: string, over: Partial<Team>): Team => ({
  id, venture: id, product: '', members: [], website: '', instagram: '', mentorKey: null,
  revenue: 0, units: 0, orders: 0, newCustomers: 0, repeatOrders: 0, aov: 0,
  channels: { offline: 0, online: 0, influencer: 0, performance: 0, b2b: 0 },
  daily: [], weekly: {}, pace: null, assessment: null, checkins: [], ...over,
})

const NOW = new Date('2026-09-30T04:30:00Z')
const mentors = [{ key: 'nisha', slug: 'nisha', name: 'Nisha Quinn', teamIds: [] }]
const teams = [
  t('A', { venture: 'beta', revenue: 300, assessment: 'On Track', pace: 'On Pace' }),
  t('B', { venture: 'Alpha', revenue: 100, assessment: 'Lagging', pace: 'Behind', product: 'Hot Chocolate', members: ['Asha Rao'] }),
  t('C', { venture: 'YŌKI', revenue: 200, assessment: null, pace: 'Behind', mentorKey: 'nisha' }),
]
const rows = teamRows(teams, teams, mentors, NOW)
const ids = (r: { id: string }[]) => r.map((x) => x.id)

describe('teams table', () => {
  it('ranks by revenue across the whole cohort', () => {
    expect(rows.map((r) => [r.id, r.rank])).toEqual([['A', 1], ['B', 3], ['C', 2]])
  })

  it('sorts by revenue, highest first by default', () => {
    expect(ids(sortRows(rows, 'revenue', 'desc'))).toEqual(['A', 'C', 'B'])
    expect(ids(sortRows(rows, 'revenue', 'asc'))).toEqual(['B', 'C', 'A'])
  })

  it('sorts names case-insensitively', () => {
    expect(sortRows(rows, 'venture', 'asc').map((r) => r.venture)).toEqual(['Alpha', 'beta', 'YŌKI'])
  })

  it('puts the most urgent assessment first, and a blank last', () => {
    expect(ids(sortRows(rows, 'assessment', 'asc'))).toEqual(['B', 'A', 'C'])
  })

  it('breaks ties on revenue rank', () => {
    expect(ids(sortRows(rows, 'pace', 'asc'))).toEqual(['C', 'B', 'A'])
  })

  it('ignores a sort it does not know rather than failing', () => {
    expect(parseSort('drop table', 'sideways')).toEqual({ sort: 'revenue', dir: 'desc' })
    expect(parseSort('units', undefined)).toEqual({ sort: 'units', dir: 'desc' })
  })

  it('does not send check-in notes to the browser', () => {
    expect(Object.keys(rows[0])).not.toContain('checkins')
    expect(Object.keys(rows[0])).not.toContain('daily')
  })
})

describe('search', () => {
  const find = (q: string) => ids(rows.filter((r) => matches(r, q)))

  it('finds a team by venture, ID, product, mentor or student', () => {
    expect(find('alpha')).toEqual(['B'])
    expect(find('c')).toContain('C')
    expect(find('chocolate')).toEqual(['B'])
    expect(find('nisha')).toEqual(['C'])
    expect(find('asha')).toEqual(['B'])
  })

  it('needs every word, in any order and case', () => {
    expect(find('RAO asha')).toEqual(['B'])
    expect(find('asha nisha')).toEqual([])
  })

  it('ignores accents', () => {
    expect(find('yoki')).toEqual(['C'])
  })

  it('matches everything when empty', () => {
    expect(find('  ')).toEqual(['A', 'B', 'C'])
  })
})
