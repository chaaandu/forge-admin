/**
 * The index behind the search box in the top bar: every team, every student
 * and every mentor, each pointing at the page that answers "where is this?".
 * Pure, and slim on purpose — it is sent to the browser on every page, so it
 * carries names and links, never figures or notes.
 */
import type { Dashboard } from './parse.ts'

export type Entry = {
  kind: 'team' | 'student' | 'mentor'
  label: string
  /** The second line: a team's ID and product, a student's team, a mentor's team count. */
  sub: string
  /** Path without the /admin basePath. */
  href: string
  /** Folded label, for ranking. */
  key: string
  /** Folded label plus everything else it should be found by. */
  hay: string
}

export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function buildIndex(d: Pick<Dashboard, 'teams' | 'mentors'>): Entry[] {
  const mentorName = (key: string | null) => d.mentors.find((m) => m.key === key)?.name ?? ''
  const out: Entry[] = []
  for (const t of d.teams) {
    const label = t.venture || t.id
    out.push({
      kind: 'team',
      label,
      sub: [t.id, t.product].filter(Boolean).join(' · '),
      href: `/teams/${t.id}`,
      key: fold(label),
      hay: fold([label, t.id, t.product, mentorName(t.mentorKey)].join(' ')),
    })
    for (const m of t.members) {
      out.push({ kind: 'student', label: m, sub: `${label} · ${t.id}`, href: `/teams/${t.id}`, key: fold(m), hay: fold(`${m} ${label}`) })
    }
  }
  for (const m of d.mentors) {
    out.push({ kind: 'mentor', label: m.name, sub: `${m.teamIds.length} teams`, href: `/mentors/${m.slug}`, key: fold(m.name), hay: fold(m.name) })
  }
  return out
}

/**
 * Best matches first: a name that starts with what was typed, then a word in
 * it that does, then anything containing every word. Within a tier, teams
 * before mentors before students, then A–Z.
 */
export function search(index: Entry[], query: string, limit = 12): Entry[] {
  const q = fold(query)
  if (!q) return []
  const words = q.split(' ')
  const kindOrder = { team: 0, mentor: 1, student: 2 }
  return index
    .filter((e) => words.every((w) => e.hay.includes(w)))
    .map((e) => ({ e, tier: e.key.startsWith(q) ? 0 : e.key.split(' ').some((w) => w.startsWith(words[0])) ? 1 : 2 }))
    .sort((a, b) => a.tier - b.tier || kindOrder[a.e.kind] - kindOrder[b.e.kind] || a.e.label.localeCompare(b.e.label))
    .slice(0, limit)
    .map((x) => x.e)
}
