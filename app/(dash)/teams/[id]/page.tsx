import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChannelStack, WeeklyColumns } from '@/components/charts'
import { CheckinTimeline } from '@/components/Checkins'
import type { Metadata } from 'next'
import { DailyChart } from '@/components/DailyChart'
import { ReadError, Updated } from '@/components/Shell'
import { Assessment, MentorLink, Pace } from '@/components/tables'
import { ScrollToLatest } from '@/components/ScrollToLatest'
import { ThisWeekLabel } from '@/components/WeekDelta'
import { inr } from '@/lib/format'
import { instagramUrl, linkLabel, websiteUrl } from '@/lib/links'
import { byRevenue, channelTotals, dailyCohort, firstSaleDate, mentorWeek, weekSoFar } from '@/lib/metrics'
import type { Checkin } from '@/lib/parse'
import { staffDashboard } from '@/lib/session'
import { getDashboard } from '@/lib/sheets'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const t = await getDashboard()
    .then((d) => d.teams.find((x) => x.id === id.toUpperCase()))
    .catch(() => undefined)
  return { title: t?.venture || id.toUpperCase() }
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { data, error } = await staffDashboard()
  if (error !== null) return <ReadError message={error} />

  const { id } = await params
  const ranked = [...data.teams].sort(byRevenue)
  const i = ranked.findIndex((t) => t.id === id.toUpperCase())
  if (i < 0) notFound()
  const t = ranked[i]
  const prev = ranked[i - 1]
  const next = ranked[i + 1]
  const mentor = data.mentors.find((m) => m.key === t.mentorKey) ?? null
  const now = new Date()
  const week = weekSoFar([t], now)
  const site = websiteUrl(t.website)
  const insta = instagramUrl(t.instagram)
  const weeksThrough = data.currentWeek ?? Math.max(1, ...Object.keys(t.weekly).map(Number))
  const scored = t.checkins.filter((c) => c.preparedness || c.dataPitch || c.interpersonal)

  return (
    <>
      <div className="crumbs">
        <Link href="/teams">Teams</Link> / {t.id}
      </div>
      <div className="page-head team-head">
        <div>
          <h1>
            {t.venture || t.id}
            <span className="id">{t.id}</span>
          </h1>
          <div className="team-meta">
            {t.product && (
              <span>
                <b>Sells</b>
                {t.product}
              </span>
            )}
            <span>
              <b>Mentor</b>
              <MentorLink m={mentor} />
            </span>
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer">
                {linkLabel(site)} ↗
              </a>
            )}
            {insta && (
              <a href={insta} target="_blank" rel="noopener noreferrer">
                {linkLabel(insta)} ↗
              </a>
            )}
          </div>
          {t.members.length > 0 && (
            <div className="members">
              {t.members.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          )}
        </div>
        <div className="head-tools col">
          <Updated readAt={data.readAt} />
          <nav className="pager" aria-label="Neighbouring teams by revenue">
            <Link className="cta" href={`/compare?teams=${t.id}`}>
              Compare
            </Link>
            {prev && <Link href={`/teams/${prev.id}`}>← #{i} {prev.venture || prev.id}</Link>}
            {next && <Link href={`/teams/${next.id}`}>#{i + 2} {next.venture || next.id} →</Link>}
          </nav>
        </div>
      </div>

      <section className="grid g-kpi6">
        <div className="card">
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value num">{inr(t.revenue)}</div>
          <div className="kpi-sub">
            rank <b>{i + 1}</b> of {ranked.length}
          </div>
        </div>
        <div className="card">
          <ThisWeekLabel week={week} />
          <div className="kpi-value num">{inr(week.thisWeek)}</div>
          <div className="kpi-sub">
            last week <b>{inr(week.lastWeekFull)}</b>
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Units sold</div>
          <div className="kpi-value num">{t.units.toLocaleString('en-IN')}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Paid orders</div>
          <div className="kpi-value num">{t.orders.toLocaleString('en-IN')}</div>
          <div className="kpi-sub">
            <b>{t.newCustomers}</b> new · <b>{t.repeatOrders}</b> repeat
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Average order</div>
          <div className="kpi-value num">{inr(t.aov)}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Status</div>
          <div className="pills" style={{ marginTop: 10 }}>
            <Pace value={t.pace} />
            <Assessment value={t.assessment} />
          </div>
        </div>
      </section>

      <div className="stack">
        <section className="grid g-3">
          <DailyChart title="Revenue by day" days={dailyCohort([t], now, firstSaleDate(data.teams))} />
          <div className="card">
            <div className="card-h">
              <h2>Revenue by channel</h2>
            </div>
            <ChannelStack rows={channelTotals([t])} />
          </div>
        </section>

        <section className="grid g-2">
          <div className="card">
            <div className="card-h">
              <h2>Revenue by week</h2>
            </div>
            <WeeklyColumns weekly={t.weekly} through={weeksThrough} />
          </div>
          <div className="card">
            <div className="card-h">
              <h2>Check-in scores</h2>
            </div>
            <ScoresTable checkins={scored} />
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Mentor check-ins</h2>
          </div>
          <CheckinTimeline checkins={t.checkins} throughWeek={mentorWeek(now)} />
        </section>
      </div>
    </>
  )
}

function ScoresTable({ checkins }: { checkins: Checkin[] }) {
  if (checkins.length === 0) return <div className="empty">No scores written yet.</div>
  const rows: [string, keyof Pick<Checkin, 'preparedness' | 'dataPitch' | 'interpersonal'>][] = [
    ['Preparedness', 'preparedness'],
    ['Data & pitch', 'dataPitch'],
    ['Interpersonal', 'interpersonal'],
  ]
  const weeks = [...checkins].sort((a, b) => a.week - b.week)
  return (
    <ScrollToLatest>
    <table className="t grid-t scores-t">
      <thead>
        <tr>
          <th />
          {weeks.map((c) => (
            <th key={c.week} className="r">
              Week {c.week}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, key]) => (
          <tr key={key}>
            <td className="strong">{label}</td>
            {weeks.map((c) => {
              const s = c[key]
              return (
                <td key={c.week} className="fig num">
                  {s ? (s.outOf ? `${s.value}/${s.outOf}` : s.value) : '–'}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
    </ScrollToLatest>
  )
}
