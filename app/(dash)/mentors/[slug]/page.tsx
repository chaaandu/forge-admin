import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BucketBars, ChannelStack } from '@/components/charts'
import { CheckinCard } from '@/components/Checkins'
import { MentorPicker } from '@/components/Picker'
import type { Metadata } from 'next'
import { DailyChart } from '@/components/DailyChart'
import { ReadError, Updated } from '@/components/Shell'
import { ThisWeekLabel, WeekDelta } from '@/components/WeekDelta'
import { TeamCheckinGrid } from '@/components/CheckinHistory'
import { FlaggedTable, TeamLink } from '@/components/tables'
import { TeamsTable } from '@/components/TeamsTable'
import { dayRange, inr, pct } from '@/lib/format'
import {
  buckets,
  checkinGrid,
  channelTotals,
  cohortRevenue,
  dailyCohort,
  firstSaleDate,
  flaggedTeams,
  mentorSummary,
  mentorWeek,
  weekSoFar,
} from '@/lib/metrics'
import { staffDashboard } from '@/lib/session'
import { getDashboard } from '@/lib/sheets'
import { parseSort, sortRows, teamRows } from '@/lib/teamRows'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const m = await getDashboard()
    .then((d) => d.mentors.find((x) => x.slug === slug))
    .catch(() => undefined)
  return { title: m?.name ?? 'Mentor' }
}

export default async function MentorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { data, error } = await staffDashboard()
  if (error !== null) return <ReadError message={error} />

  const { slug } = await params
  const mentor = data.mentors.find((m) => m.slug === slug)
  if (!mentor) notFound()

  const q = await searchParams
  const { sort, dir } = parseSort(q.sort, q.dir)
  const now = new Date()
  const s = mentorSummary(mentor, data.teams, now)
  const week = weekSoFar(s.teams, now)
  const w = mentorWeek(now)
  const withNotes = s.teams.filter((t) => t.checkins.length > 0)
  const withoutNotes = s.teams.filter((t) => t.checkins.length === 0)

  return (
    <>
      <div className="crumbs">
        <Link href="/mentors">Mentors</Link> / {mentor.name}
      </div>
      <div className="page-head">
        <div>
          <h1>{mentor.name}</h1>
          <p>{s.teams.length} teams</p>
        </div>
        <div className="head-tools">
          <MentorPicker
            options={data.mentors.map((m) => ({ value: m.slug, label: m.name }))}
            value={mentor.slug}
            to={{ kind: 'mentor' }}
            allLabel="All mentors"
          />
          <Updated readAt={data.readAt} />
        </div>
      </div>

      <section className="grid g-kpi">
        <div className="card hero">
          <div className="kpi-label">Revenue</div>
          <div className="kpi-value num">{inr(s.revenue)}</div>
          <div className="kpi-sub">
            <b>{inr(s.average)}</b> per team · {pct(s.revenue, cohortRevenue(data.teams), 1)} of cohort
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
            {s.onPace}
            <span className="of"> / {s.teams.length}</span>
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Flagged</div>
          <div className="kpi-value num">
            {s.flagged}
            <span className="of"> / {s.teams.length}</span>
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">
            Checked in · wk {w - 1}–{w}
          </div>
          <div className="kpi-value num">
            {s.recent}
            <span className="of"> / {s.teams.length}</span>
          </div>
        </div>
      </section>

      <div className="stack">
        <section className="grid g-3">
          <DailyChart title="Revenue by day" days={dailyCohort(s.teams, now, firstSaleDate(data.teams))} />
          <div className="card">
            <div className="card-h">
              <h2>Revenue by channel</h2>
            </div>
            <ChannelStack rows={channelTotals(s.teams)} />
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Teams</h2>
          </div>
          <TeamsTable
            rows={sortRows(teamRows(s.teams, data.teams, data.mentors, now), sort, dir)}
            sort={sort}
            dir={dir}
            showMentor={false}
            weekLabel={dayRange(week.monday, week.sunday)}
          />
        </section>

        <section className="grid g-3">
          <div className="card">
            <div className="card-h">
              <h2>
                Flagged <span className="count">{s.flagged}</span>
              </h2>
            </div>
            <FlaggedTable teams={flaggedTeams(s.teams)} mentorOf={() => mentor} showMentor={false} />
          </div>
          <div className="card">
            <div className="card-h">
              <h2>Teams by revenue</h2>
            </div>
            <BucketBars rows={buckets(s.teams)} />
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Check-in history</h2>
          </div>
          <TeamCheckinGrid grid={checkinGrid(s.teams, w)} current={w} />
        </section>

        <section className="card">
          <div className="card-h">
            <h2>Latest check-ins</h2>
          </div>
          <div className="timeline">
            {withNotes.map((t) => {
              const latest = t.checkins.reduce((a, b) => (b.week > a.week ? b : a))
              return (
                <CheckinCard
                  key={t.id}
                  c={latest}
                  heading={
                    <>
                      <TeamLink t={t} /> <span className="sub">· week {latest.week}</span>
                    </>
                  }
                />
              )
            })}
            {withoutNotes.length > 0 && (
              <div className="checkin none">
                <span className="wk">No check-in written yet</span>
                <span className="sub">
                  {withoutNotes.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && ', '}
                      <Link href={`/teams/${t.id}`}>{t.venture || t.id}</Link>
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
