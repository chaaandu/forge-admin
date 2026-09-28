/**
 * Comparing teams side by side. Pure.
 */
import type { Team } from './parse.ts'

export const MAX_COMPARE = 3

/** `?teams=vbc121, VBC126,VBC121` → known IDs, upper-cased, de-duplicated, at most three, in the order given. */
export function parseTeamsParam(param: string | undefined, known: Set<string>): string[] {
  const out: string[] = []
  for (const raw of (param ?? '').split(',')) {
    const id = raw.trim().toUpperCase()
    if (id && known.has(id) && !out.includes(id)) out.push(id)
    if (out.length === MAX_COMPARE) break
  }
  return out
}

/** Running total of a team's revenue for every day in `days`, so trajectories can be laid over each other. */
export function cumulative(t: Team, days: string[]): number[] {
  const byDate = new Map(t.daily.map((d) => [d.date, d.revenue]))
  let sum = 0
  return days.map((d) => (sum += byDate.get(d) ?? 0))
}

/**
 * Which columns hold the best figure in a row: the highest, or the lowest when
 * `lowerIsBetter`. Nobody is best when all are equal or fewer than two compete.
 */
export function best(values: (number | null)[], lowerIsBetter = false): boolean[] {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length < 2 || nums.every((v) => v === nums[0])) return values.map(() => false)
  const target = lowerIsBetter ? Math.min(...nums) : Math.max(...nums)
  return values.map((v) => v === target)
}

/** A row says nothing when every team has zero or nothing in it. */
export function isEmptyRow(values: (number | null)[]): boolean {
  return values.every((v) => v === null || v === 0)
}

/** How far each team is behind the leader; null for the leader, for a tie with it, or with one team. */
export function behindLeader(values: number[]): (number | null)[] {
  if (values.length < 2) return values.map(() => null)
  const top = Math.max(...values)
  return values.map((v) => (v === top ? null : top - v))
}
