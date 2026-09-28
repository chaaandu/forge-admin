import { describe, expect, it } from 'vitest'
import { behindLeader, best, cumulative, isEmptyRow, parseTeamsParam } from './compare.ts'
import type { Team } from './parse.ts'

const known = new Set(['VBC101', 'VBC121', 'VBC126', 'VBC130'])

describe('parseTeamsParam', () => {
  it('keeps known IDs in order, upper-cased, once each, at most three', () => {
    expect(parseTeamsParam('vbc121, VBC126,VBC121', known)).toEqual(['VBC121', 'VBC126'])
    expect(parseTeamsParam('VBC101,VBC121,VBC126,VBC130', known)).toEqual(['VBC101', 'VBC121', 'VBC126'])
  })

  it('drops unknown or disbanded teams rather than failing', () => {
    expect(parseTeamsParam('VBC104,VBC999,<script>', known)).toEqual([])
    expect(parseTeamsParam(undefined, known)).toEqual([])
  })
})

describe('cumulative', () => {
  it('adds up day by day, carrying quiet days', () => {
    const t = { daily: [{ date: '2026-09-10', revenue: 5 }, { date: '2026-09-12', revenue: 3 }] } as Team
    expect(cumulative(t, ['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'])).toEqual([0, 5, 5, 8])
  })
})

describe('best', () => {
  it('marks the highest', () => {
    expect(best([3, 9, 5])).toEqual([false, true, false])
  })

  it('marks the lowest when lower is better', () => {
    expect(best([3, 9, 5], true)).toEqual([true, false, false])
  })

  it('marks nobody on a tie or with one team', () => {
    expect(best([4, 4])).toEqual([false, false])
    expect(best([7])).toEqual([false])
    expect(best([null, 2])).toEqual([false, false])
  })
})

describe('isEmptyRow', () => {
  it('is empty when every team has zero or nothing', () => {
    expect(isEmptyRow([0, 0, null])).toBe(true)
    expect(isEmptyRow([0, 5])).toBe(false)
  })
})

describe('behindLeader', () => {
  it('gives each team its gap to the leader', () => {
    expect(behindLeader([100, 150, 150, 90])).toEqual([50, null, null, 60])
    expect(behindLeader([100])).toEqual([null])
  })
})
