import type { Metadata } from 'next'
import { BucketBars, ChannelStack } from '@/components/charts'
import { DailyChart } from '@/components/DailyChart'
import { ReadError, Updated } from '@/components/Shell'
import { MentorCheckinGrid } from '@/components/CheckinHistory'
import { FlaggedTable, Leaderboard } from '@/components/tables'
import { Tabs } from '@/components/Tabs'
import { ThisWeekLabel, WeekDelta } from '@/components/WeekDelta'
import { inr, inrShort, pct } from '@/lib/format'
import {
  buckets,
  byRevenue,
  byUnits,
  channelTotals,
  cohortRevenue,
  cohortTarget,
  dailyCohort,
  flaggedTeams,
  hasRecentCheckin,
  mentorCheckinGrid,
  mentorWeek,
  weekSoFar,
} from '@/lib/metrics'
import type { Team } from '@/lib/parse'
import { staffDashboard } from '@/lib/session'

export const metadata: Metadata = { title: 'Overview' }

export default async function Overview() {
  const { data, error } = await staffDashboard()
  if (error !== null) return <ReadError message={error} />

  const now = new Date()
  const { teams, mentors } = data
  const mentorOf = (t: Team) => mentors.find((m) => m.key === t.mentorKey) ?? null

  const revenue = cohortRevenue(teams)
  const target = cohortTarget(teams)
  const week = weekSoFar(teams, now)
  const onPace = teams.filter((t) => t.pace === 'On Pace').length
  const w = mentorWeek(now)
  const checkedIn = teams.filter((t) => hasRecentCheckin(t, now)).length

  const ranked = [...teams].sort(byRevenue)
  const flagged = flaggedTeams(teams)
  const top = ranked[0]?.revenue ?? 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>
            Week {w} · {teams.length} teams · {mentors.length} mentors
          </p>
        </div>
        <Updated readAt={data.readAt} />
      </div>

      <section className="grid g-kpi">
        <div className="card hero">
          <div className="kpi-label">Cohort revenue</div>
          <div className="kpi-value num">{inr(revenue)}</div>
          <div className="meter" aria-hidden>
            <span style={{ width: `${Math.min(100, (revenue / target) * 100)}%` }} />
          </div>
          <div className="kpi-sub">
            <b>{pct(revenue, target, 1)}</b> of {inrShort(target)} target
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Average per team</div>
          <div className="kpi-value num">{inr(teams.length ? revenue / teams.length : 0)}</div>
          <div className="kpi-sub">
            median <b>{inr(ranked[Math.floor(ranked.length / 2)]?.revenue ?? 0)}</b>
          </div>
        </div>
        <div className="card">
          <ThisWeekLabel week={week} />
          <div className="kpi-value num">{inr(week.thisWeek)}</div>
          <WeekDelta week={week} />
        </div>
        <div className="card">
          <div className="kpi-label">On pace</div>
          <div className="kpi-value num">
            {onPace}
            <span className="of"> / {teams.length}</span>
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">
            Checked in · wk {w - 1}–{w}
          </div>
          <div className="kpi-value num">
            {checkedIn}
            <span className="of"> / {teams.length}</span>
          </div>
        </div>
      </section>

      <div className="stack">
        <section className="grid g-3">
          <DailyChart title="Revenue by day" days={dailyCohort(teams, now)} />
          <div className="card">
            <div className="card-h">
              <h2>Revenue by channel</h2>
            </div>
            <ChannelStack rows={channelTotals(teams)} />
          </div>
        </section>

        <section className="grid g-3">
          <div className="card">
            <div className="card-h">
              <h2>
                Flagged by mentors <span className="count">{flagged.length}</span>
              </h2>
            </div>
            <FlaggedTable teams={flagged} mentorOf={mentorOf} />
          </div>
          <div className="card">
            <div className="card-h">
              <h2>Check-ins by week</h2>
            </div>
            <MentorCheckinGrid grid={mentorCheckinGrid(teams, mentors, w)} current={w} />
          </div>
        </section>

        <section className="grid g-3">
          <div className="card">
            <div className="card-h">
              <h2>Leaderboards</h2>
            </div>
            <Tabs labels={['Revenue', 'Units', 'Least revenue', 'Profit']}>
              <Leaderboard teams={ranked.slice(0, 10)} value={(t) => t.revenue} mentorOf={mentorOf} medals scaleMax={top} />
              <Leaderboard
                teams={[...teams].sort(byUnits).slice(0, 10)}
                value={(t) => t.units}
                label="Units"
                format={(n) => n.toLocaleString('en-IN')}
                mentorOf={mentorOf}
                medals
              />
              <Leaderboard teams={[...ranked].reverse().slice(0, 10)} value={(t) => t.revenue} mentorOf={mentorOf} scaleMax={top} />
              <div>
                <Leaderboard teams={ranked.slice(0, 10)} value={(t) => t.revenue} label="Profit" mentorOf={mentorOf} medals scaleMax={top} />
                <div className="note">Shown as revenue until expenses are logged in the sheet.</div>
              </div>
            </Tabs>
          </div>
          <div className="card">
            <div className="card-h">
              <h2>Teams by revenue</h2>
            </div>
            <BucketBars rows={buckets(teams)} />
          </div>
        </section>
      </div>
    </>
  )
}
