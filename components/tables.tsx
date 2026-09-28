import Link from 'next/link'
import { inr } from '@/lib/format'
import type { MentorSummary } from '@/lib/metrics'
import { lastCheckinWeek } from '@/lib/metrics'
import type { Mentor, Team } from '@/lib/parse'

export type MentorOf = (t: Team) => Mentor | null

export function Assessment({ value }: { value: string | null }) {
  if (!value) return <span className="sub">–</span>
  const tone =
    value === 'Lagging' ? 'bad' : value === 'Needs Support' ? 'warn' : value.startsWith('Exceeding') || value === 'On Track' ? 'good' : 'neutral'
  // The sheet's own option is "Exceeding — Revise Target"; it is matched as written and shown without the dash.
  return <span className={`pill ${tone}`}>{value.replace(/\s*—\s*/g, ': ')}</span>
}

export function Pace({ value }: { value: string | null }) {
  if (!value) return <span className="sub">–</span>
  return <span className={`pill ${value === 'On Pace' ? 'good' : value === 'Behind' ? 'warn' : 'neutral'}`}>{value}</span>
}

/** `main`: this link is the row's — clicking anywhere on the row follows it (see the row links in globals.css). */
export function TeamLink({ t, product = false, main = false }: { t: { id: string; venture: string; product?: string }; product?: boolean; main?: boolean }) {
  return (
    <>
      <Link className={`venture${main ? ' row-main' : ''}`} href={`/teams/${t.id}`}>
        {t.venture || t.id}
      </Link>
      <span className="id">{t.id}</span>
      {product && t.product && <div className="sub product">{t.product}</div>}
    </>
  )
}

export function MentorLink({ m, main = false }: { m: Mentor | { name: string; slug: string } | null; main?: boolean }) {
  if (!m) return <span className="sub">–</span>
  return (
    <Link className={`mentor-link${main ? ' row-main' : ''}`} href={`/mentors/${m.slug}`}>
      {m.name}
    </Link>
  )
}

function checkinLabel(week: number | null) {
  return week ? `Week ${week}` : 'None yet'
}

export function Leaderboard({
  teams,
  value,
  format = inr,
  mentorOf,
  medals = false,
  scaleMax,
  label = 'Revenue',
}: {
  teams: Team[]
  /** The heading over the figure column. */
  label?: string
  value: (t: Team) => number
  format?: (n: number) => string
  mentorOf: MentorOf
  medals?: boolean
  /** The figure a full-width bar stands for. Pass the cohort's top figure so every board shares one scale. */
  scaleMax?: number
}) {
  if (teams.length === 0) return <div className="empty">No teams.</div>
  const max = Math.max(1, scaleMax ?? 0, ...teams.map(value))
  return (
    <table className="t">
      <thead>
        <tr>
          <th className="rank">#</th>
          <th>Team</th>
          <th className="hide-sm">Mentor</th>
          <th className="r">{label}</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t, i) => (
          <tr key={t.id} className="row-link">
            <td className="rank num">{medals && i < 3 ? <span className={`medal m${i + 1}`}>{i + 1}</span> : i + 1}</td>
            <td>
              <TeamLink t={t} main />
              <span className="inline-bar">
                <i style={{ width: `${(value(t) / max) * 100}%` }} />
              </span>
            </td>
            <td className="sub hide-sm">
              <MentorLink m={mentorOf(t)} />
            </td>
            <td className="fig num">{format(value(t))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function FlaggedTable({ teams, mentorOf, showMentor = true }: { teams: Team[]; mentorOf: MentorOf; showMentor?: boolean }) {
  if (teams.length === 0) return <div className="empty">No team is marked Lagging or Needs Support.</div>
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Team</th>
          {showMentor && <th className="hide-sm">Mentor</th>}
          <th>Mentor says</th>
          <th className="hide-sm">Pace</th>
          <th className="hide-sm">Last check-in</th>
          <th className="r">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t) => (
          <tr key={t.id} className="row-link">
            <td>
              <TeamLink t={t} main />
            </td>
            {showMentor && (
              <td className="sub hide-sm">
                <MentorLink m={mentorOf(t)} />
              </td>
            )}
            <td>
              <Assessment value={t.assessment} />
            </td>
            <td className="hide-sm">
              <Pace value={t.pace} />
            </td>
            <td className="sub hide-sm">{checkinLabel(lastCheckinWeek(t))}</td>
            <td className="fig num">{inr(t.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MentorsTable({ rows, weeks, weekLabel }: { rows: MentorSummary[]; weeks: string; weekLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue))
  return (
    <div className="table-scroll">
      <table className="t cards">
        <thead>
          <tr>
            <th>Mentor</th>
            <th className="r">Teams</th>
            <th className="r">Revenue</th>
            <th className="r">Avg per team</th>
            <th className="r">
              This week<small>{weekLabel}</small>
            </th>
            <th className="r">On pace</th>
            <th className="r">Flagged</th>
            <th>Checked in · wk {weeks}</th>
            <th className="r">Latest notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.mentor.slug} className="row-link">
              <td>
                <MentorLink m={r.mentor} main />
              </td>
              <td className="fig num" data-label="Teams">{r.teams.length}</td>
              <td className="fig num" data-label="Revenue">
                {inr(r.revenue)}
                <span className="inline-bar">
                  <i style={{ width: `${(r.revenue / max) * 100}%` }} />
                </span>
              </td>
              <td className="fig num" data-label="Avg per team">{inr(r.average)}</td>
              <td className={`fig num${r.thisWeek ? '' : ' zero'}`} data-label="This week">{inr(r.thisWeek)}</td>
              <td className="fig num" data-label="On pace">
                {r.onPace} of {r.teams.length}
              </td>
              <td className="fig num" data-label="Flagged">{r.flagged || '–'}</td>
              <td data-label="Checked in">
                <span className="num strong">
                  {r.recent} of {r.teams.length}
                </span>
                <span className="inline-bar">
                  <i style={{ width: `${(r.recent / (r.teams.length || 1)) * 100}%` }} />
                </span>
              </td>
              <td className="fig num" data-label="Latest notes">{checkinLabel(r.latestWeek)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
