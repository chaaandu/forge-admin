import { describe, expect, it } from 'vitest'
import type { Team } from './parse.ts'
import { buildIndex, search } from './searchIndex.ts'

const t = (id: string, over: Partial<Team>): Team => ({
  id, venture: id, product: '', members: [], website: '', instagram: '', mentorKey: null,
  revenue: 0, units: 0, orders: 0, newCustomers: 0, repeatOrders: 0, aov: 0,
  channels: { offline: 0, online: 0, influencer: 0, performance: 0, b2b: 0 },
  daily: [], weekly: {}, pace: null, assessment: null, checkins: [], ...over,
})

const index = buildIndex({
  teams: [
    t('VBC102', { venture: 'LUMI', product: 'Candles', members: ['Asha Rao', 'Meera Iyer'], mentorKey: 'a', revenue: 999 }),
    t('VBC126', { venture: 'Choco and co', product: 'Hot chocolate', members: ['Kabir Zephyr'], mentorKey: 'r' }),
    t('VBC113', { venture: 'Munch&co', members: ['Juno Rao'] }),
  ],
  mentors: [
    { key: 'a', slug: 'tara-quill', name: 'Tara Quill', teamIds: ['VBC102'] },
    { key: 'r', slug: 'nisha-quinn', name: 'Nisha Quinn', teamIds: ['VBC126'] },
  ],
})
const labels = (q: string) => search(index, q).map((e) => `${e.kind}:${e.label}`)

describe('global search', () => {
  it('finds a team by name, ID or product and links to its page', () => {
    expect(search(index, 'lumi')[0]).toMatchObject({ kind: 'team', href: '/teams/VBC102', sub: 'VBC102 · Candles' })
    expect(labels('vbc126')).toEqual(['team:Choco and co'])
    expect(labels('chocolate')).toEqual(['team:Choco and co'])
  })

  it('finds a student and sends them to their team', () => {
    expect(search(index, 'kabir')[0]).toMatchObject({ kind: 'student', label: 'Kabir Zephyr', sub: 'Choco and co · VBC126', href: '/teams/VBC126' })
  })

  it('finds a mentor', () => {
    expect(search(index, 'nisha')[0]).toMatchObject({ kind: 'mentor', href: '/mentors/nisha-quinn' })
  })

  it('ranks names starting with the query first', () => {
    // "co": Choco and co has a word starting "co"; Munch&co only contains it.
    expect(labels('ch')[0]).toBe('team:Choco and co')
    expect(labels('rao')).toEqual(['student:Asha Rao', 'student:Juno Rao'])
  })

  it('needs every word', () => {
    expect(labels('asha rao')).toEqual(['student:Asha Rao'])
    expect(labels('  ')).toEqual([])
  })

  it('carries names and links only, never figures or notes', () => {
    const keys = new Set(index.flatMap((e) => Object.keys(e)))
    expect([...keys].sort()).toEqual(['hay', 'href', 'key', 'kind', 'label', 'sub'])
    expect(JSON.stringify(index)).not.toContain('999')
  })
})
