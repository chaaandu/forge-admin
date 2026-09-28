import type { Metadata } from 'next'
import { CompareChart } from '@/components/CompareChart'
import { ReadError, Updated } from '@/components/Shell'
import { Assessment, MentorLink, Pace, TeamLink } from '@/components/tables'
import Link from 'next/link'
import { TeamSlots } from '@/components/TeamSlots'
import { behindLeader, best, cumulative, isEmptyRow, parseTeamsParam } from '@/lib/compare'
import { dayRange, inr, pct } from '@/lib/format'
import { byRevenue, CHANNELS, dailyCohort, flaggedTeams, lastCheckinWeek, ranks, weekSoFar } from '@/lib/metrics'
import type { Checkin, Team } from '@/lib/parse'
import { staffDashboard } from '@/lib/session'

export const metadata: Metadata = { title: 'Compare' }

type Row = {
  label: string
  values: (number | null)[]
  show: (v: number | null, i: number) => React.ReactNode
  /** A quieter second line under the figure. */
  below?: (v: number | null, i: number) => React.ReactNode
  lowerIsBetter?: boolean
  /**
   * Rows that describe rather than rank are never crowned: a channel is a team's
   * mix, not better or worse, and mentors score on different scales ("9/10"
   * against a bare "5").
   */
  noBest?: boolean
}

function latestScores(t: Team): Checkin | null {
  const scored = t.checkins.filter((c) => c.preparedness || c.dataPitch || c.interpersonal)
  return scored.length ? scored.reduce((a, b) => (b.week > a.week ? b : a)) : null
}

export default async function Compare({ searchParams }: { searchParams: Promise<{ teams?: string }> }) {
  const { data, error } = await staffDashboard()
  if (error !== null) return <ReadError message={error} />

  const now = new Date()
  const { teams: param } = await searchParams
  const ids = parseTeamsParam(param, new Set(data.teams.map((t) => t.id)))
  const teams = ids.map((id) => data.teams.find((t) => t.id === id)!)
  const rank = ranks(data.teams)
  const mentorOf = (t: Team) => data.mentors.find((m) => m.key === t.mentorKey) ?? null
  const weeks = teams.map((t) => weekSoFar([t], now))
  const days = dailyCohort(data.teams, now).map((d) => d.date)
  const ranked = [...data.teams].sort(byRevenue)
  const options = ranked.map((t) => ({ id: t.id, venture: t.venture, product: t.product, mentor: mentorOf(t)?.name ?? '' }))

  // One-click starting points. A starter needs at least two teams to be worth offering.
  const thisWeek = new Map(data.teams.map((t) => [t.id, weekSoFar([t], now).thisWeek]))
  const starters = [
    { label: 'Top 3 by revenue', teams: ranked.slice(0, 3) },
    {
      label: 'Top 3 this week',
      teams: [...data.teams].filter((t) => thisWeek.get(t.id)! > 0).sort((a, b) => thisWeek.get(b.id)! - thisWeek.get(a.id)!).slice(0, 3),
    },
    { label: 'Flagged by mentors', teams: flaggedTeams(data.teams).slice(0, 3) },
  ].filter((s) => s.teams.length >= 2)

  const money = (v: number | null) => (v === null ? '–' : inr(v))
  const gaps = behindLeader(teams.map((t) => t.revenue))
  const count = (v: number | null) => (v === null ? '–' : v.toLocaleString('en-IN'))
  const sales: Row[] = [
    {
      label: 'Revenue',
      values: teams.map((t) => t.revenue),
      show: money,
      below: (_v, i) => {
        const gap = gaps[i]
        return gap ? <span className="cmp-gap">{inr(gap)} behind</span> : null
      },
    },
    { label: 'This week', values: weeks.map((w) => w.thisWeek), show: money },
    { label: 'Last week', values: weeks.map((w) => w.lastWeekFull), show: money },
    { label: 'Units sold', values: teams.map((t) => t.units), show: count },
    { label: 'Paid orders', values: teams.map((t) => t.orders), show: count },
    { label: 'Average order', values: teams.map((t) => t.aov), show: money },
    { label: 'New customers', values: teams.map((t) => t.newCustomers), show: count },
    { label: 'Repeat orders', values: teams.map((t) => t.repeatOrders), show: count },
  ]
  const channels: Row[] = CHANNELS.map((c) => ({
    label: c.label,
    noBest: true,
    values: teams.map((t) => t.channels[c.key]),
    show: money,
    below: (v, i) =>
      v ? (
        <span className="share">
          <span className="share-track">
            <i className={`cmp-${i + 1}`} style={{ width: pct(v, teams[i].revenue) }} />
          </span>
          {pct(v, teams[i].revenue)}
        </span>
      ) : null,
  }))
  const scores = teams.map(latestScores)
  const scoreRow = (label: string, key: 'preparedness' | 'dataPitch' | 'interpersonal'): Row => ({
    label,
    noBest: true,
    values: scores.map((c) => c?.[key]?.value ?? null),
    show: (_v, i) => {
      const s = scores[i]?.[key]
      return s ? `${s.value}${s.outOf ? `/${s.outOf}` : ''}` : '–'
    },
  })

  // Rows that are zero or blank for every team say nothing; they are left out
  // and named once under the table instead.
  const visible = (rows: Row[], hidden: string[]) =>
    rows.filter((r) => {
      if (!isEmptyRow(r.values)) return true
      hidden.push(r.label)
      return false
    })
  const zeroRows: string[] = []
  const unscored: string[] = []

  // Filtered here, before rendering, so the footnote below knows what was left out.
  const salesRows = visible(sales, zeroRows)
  const channelRows = visible(channels, zeroRows)
  const scoreRows = visible(
    [scoreRow('Preparedness', 'preparedness'), scoreRow('Data & pitch', 'dataPitch'), scoreRow('Interpersonal', 'interpersonal')],
    unscored,
  )

  const Body = ({ title, rows: shown }: { title: string; rows: Row[] }) => {
    if (shown.length === 0) return null
    return (
      <tbody>
        <tr className="cmp-group">
          <th colSpan={teams.length + 1}>{title}</th>
        </tr>
        {shown.map((r) => {
          const win = teams.length > 1 && !r.noBest ? best(r.values, r.lowerIsBetter) : r.values.map(() => false)
          return (
            <tr key={r.label}>
              <td className="cmp-label">{r.label}</td>
              {r.values.map((v, i) => (
                <td key={teams[i].id} className={`num${win[i] ? ' best' : ''}`}>
                  <span className="v">{r.show(v, i)}</span>
                  {r.below?.(v, i)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Compare</h1>
        </div>
        <Updated readAt={data.readAt} />
      </div>

      <section className={`card cmp-pick${teams.length === 0 ? ' fresh' : ''}`}>
        {teams.length === 0 && (
          <div className="cmp-intro">
            <h2>Pick two or three teams</h2>
            <p>See their revenue so far, how they sell and what their mentors say, side by side.</p>
          </div>
        )}
        <TeamSlots all={options} selected={ids} />
        {teams.length === 0 && starters.length > 0 && (
          <div className="starters">
            <span className="starters-label">Or start with</span>
            {starters.map((st) => (
              <Link key={st.label} className="starter" href={`/compare?teams=${st.teams.map((t) => t.id).join(',')}`} replace scroll={false}>
                <b>{st.label}</b>
                <small>{st.teams.map((t) => t.venture || t.id).join(' · ')}</small>
              </Link>
            ))}
          </div>
        )}
        {teams.length === 1 && <p className="cmp-hint">Add one more team to see the comparison.</p>}
      </section>

      {teams.length >= 2 && (
        <div className="stack">
          <section className="card">
            <div className="card-h chart-h">
              <div>
                <h2>Revenue so far</h2>
                <div className="chart-span">
                  Running total · {days.length} days · {days.length ? dayRange(days[0], days[days.length - 1]) : ''}
                </div>
              </div>
            </div>
            <CompareChart
              days={days}
              series={teams.map((t, i) => ({ id: t.id, label: t.venture || t.id, slot: i + 1, values: cumulative(t, days) }))}
            />
          </section>

          <section className="card">
            <div className="table-scroll cmp-wrap">
              <table className={`t cmp cmp-n${teams.length}`}>
                <thead>
                  <tr>
                    <th />
                    {teams.map((t, i) => (
                      <th key={t.id} className="cmp-head">
                        <span className={`cmp-sw cmp-${i + 1}`} />
                        <TeamLink t={t} />
                        <div className="sub">
                          #{rank.get(t.id)} · <MentorLink m={mentorOf(t)} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <Body title="Sales" rows={salesRows} />
                <Body title="Revenue by channel" rows={channelRows} />
                <tbody>
                  <tr className="cmp-group">
                    <th colSpan={teams.length + 1}>Mentor</th>
                  </tr>
                  <tr>
                    <td className="cmp-label">Pace</td>
                    {teams.map((t) => (
                      <td key={t.id}>
                        <Pace value={t.pace} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="cmp-label">Mentor says</td>
                    {teams.map((t) => (
                      <td key={t.id}>
                        <Assessment value={t.assessment} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="cmp-label">Last check-in</td>
                    {teams.map((t) => (
                      <td key={t.id} className="sub">
                        {lastCheckinWeek(t) ? `Week ${lastCheckinWeek(t)}` : 'None yet'}
                      </td>
                    ))}
                  </tr>
                </tbody>
                <Body title="Latest scores" rows={scoreRows} />
              </table>
            </div>
            {(zeroRows.length > 0 || unscored.length > 0) && (
              <p className="cmp-foot">
                {zeroRows.length > 0 && <>Not shown, zero for every team: {zeroRows.join(', ')}. </>}
                {unscored.length === 3 && <>No check-in scores written for {teams.length === 1 ? 'this team' : 'these teams'} yet.</>}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
