import { MentorPicker } from '@/components/Picker'
import type { Metadata } from 'next'
import { ReadError, Updated } from '@/components/Shell'
import { MentorCheckinGrid } from '@/components/CheckinHistory'
import { MentorsTable } from '@/components/tables'
import { dayRange } from '@/lib/format'
import { mentorCheckinGrid, mentorSummary, mentorWeek, weekSoFar } from '@/lib/metrics'
import { staffDashboard } from '@/lib/session'

export const metadata: Metadata = { title: 'Mentors' }

export default async function Mentors() {
  const { data, error } = await staffDashboard()
  if (error !== null) return <ReadError message={error} />

  const now = new Date()
  const rows = data.mentors.map((m) => mentorSummary(m, data.teams, now)).sort((a, b) => b.revenue - a.revenue)
  const w = mentorWeek(now)
  const wk = weekSoFar([], now)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mentors</h1>
          <p>
            {data.mentors.length} mentors
          </p>
        </div>
        <div className="head-tools">
          <MentorPicker
            options={data.mentors.map((m) => ({ value: m.slug, label: m.name }))}
            value=""
            to={{ kind: 'mentor' }}
            allLabel="All mentors"
          />
          <Updated readAt={data.readAt} />
        </div>
      </div>

      <div className="stack flush">
        <section className="card">
          <MentorsTable rows={rows} weeks={`${w - 1}–${w}`} weekLabel={dayRange(wk.monday, wk.sunday)} />
        </section>
        <section className="card">
          <div className="card-h">
            <h2>Check-ins by week</h2>
          </div>
          <MentorCheckinGrid grid={mentorCheckinGrid(data.teams, data.mentors, w)} current={w} />
        </section>
      </div>
    </>
  )
}
