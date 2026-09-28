/**
 * The rows of the teams table, how they sort and how search matches them.
 * Pure: `now` is passed in.
 *
 * A row is deliberately slim — no check-in notes, no daily history — because
 * the table is interactive and every row is sent to the browser.
 */
import { lastCheckinWeek, ranks, weekSoFar } from './metrics.ts'
import type { Channels, Mentor, Team } from './parse.ts'

export type TeamRow = {
  id: string
  venture: string
  product: string
  rank: number
  mentor: { name: string; slug: string } | null
  revenue: number
  thisWeek: number
  units: number
  orders: number
  aov: number
  channels: Channels
  pace: string | null
  assessment: string | null
  lastCheckin: number | null
  /** Lower-cased venture, ID, product, mentor and students, for search. */
  haystack: string
}

export const SORTS = ['revenue', 'venture', 'mentor', 'week', 'units', 'orders', 'aov', 'pace', 'assessment', 'checkin'] as const
export type SortKey = (typeof SORTS)[number]
export type Dir = 'asc' | 'desc'

/** The direction a column sorts in when first clicked: figures high-first, names A–Z. */
export const DEFAULT_DIR: Record<SortKey, Dir> = {
  revenue: 'desc',
  venture: 'asc',
  mentor: 'asc',
  week: 'desc',
  units: 'desc',
  orders: 'desc',
  aov: 'desc',
  pace: 'asc',
  assessment: 'asc',
  checkin: 'desc',
}

export function parseSort(sort: string | undefined, dir: string | undefined): { sort: SortKey; dir: Dir } {
  const s = (SORTS as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : 'revenue'
  const d = dir === 'asc' || dir === 'desc' ? dir : DEFAULT_DIR[s]
  return { sort: s, dir: d }
}

export function teamRows(teams: Team[], all: Team[], mentors: Mentor[], now: Date): TeamRow[] {
  const rank = ranks(all)
  return teams.map((t) => {
    const m = mentors.find((x) => x.key === t.mentorKey) ?? null
    return {
      id: t.id,
      venture: t.venture,
      product: t.product,
      rank: rank.get(t.id) ?? 0,
      mentor: m ? { name: m.name, slug: m.slug } : null,
      revenue: t.revenue,
      thisWeek: weekSoFar([t], now).thisWeek,
      units: t.units,
      orders: t.orders,
      aov: t.aov,
      channels: t.channels,
      pace: t.pace,
      assessment: t.assessment,
      lastCheckin: lastCheckinWeek(t),
      haystack: fold([t.venture, t.id, t.product, m?.name ?? '', ...t.members].join(' ')),
    }
  })
}

/** Lower case, accents off (YŌKI → yoki), so search is forgiving. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Every word typed must appear somewhere in the row: "choco b2b" narrows to teams matching both. */
export function matches(row: TeamRow, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  return words.every((w) => row.haystack.includes(w))
}

// Most urgent first when ascending.
const ASSESSMENT_ORDER = ['Lagging', 'Needs Support', 'On Track', 'Exceeding — Revise Target']
const PACE_ORDER = ['Behind', 'On Pace']
const orderOf = (list: string[], v: string | null) => (v === null ? list.length + 1 : list.indexOf(v) === -1 ? list.length : list.indexOf(v))

/** Sorts on the chosen column; every tie falls back to revenue rank, so the order is always total. */
export function sortRows(rows: TeamRow[], sort: SortKey, dir: Dir): TeamRow[] {
  const key = (r: TeamRow): number | string => {
    switch (sort) {
      case 'revenue': return -r.rank // rank 1 is the most revenue
      case 'venture': return (r.venture || r.id).toLowerCase()
      case 'mentor': return r.mentor?.name.toLowerCase() ?? '￿'
      case 'week': return r.thisWeek
      case 'units': return r.units
      case 'orders': return r.orders
      case 'aov': return r.aov
      case 'pace': return orderOf(PACE_ORDER, r.pace)
      case 'assessment': return orderOf(ASSESSMENT_ORDER, r.assessment)
      case 'checkin': return r.lastCheckin ?? 0
    }
  }
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka < kb) return -sign
    if (ka > kb) return sign
    return a.rank - b.rank
  })
}
