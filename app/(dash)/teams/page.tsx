import { MentorPicker } from '@/components/Picker'
import type { Metadata } from 'next'
import { ReadError, Updated } from '@/components/Shell'
import { TeamsTable } from '@/components/TeamsTable'
import { dayRange, inr } from '@/lib/format'
import { cohortRevenue, weekSoFar } from '@/lib/metrics'
import { staffDashboard } from '@/lib/session'
import { parseSort, sortRows, teamRows } from '@/lib/teamRows'

export const metadata: Metadata = { title: 'Teams' }

export default async function Teams({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { data, error } = await staffDashboard()
  if (error !== null) return <ReadError message={error} />

  const q = await searchParams
  const { sort, dir } = parseSort(q.sort, q.dir)
  const mentor = data.mentors.find((m) => m.slug === q.mentor) ?? null
  const shown = mentor ? data.teams.filter((t) => t.mentorKey === mentor.key) : data.teams
  const now = new Date()
  const rows = sortRows(teamRows(shown, data.teams, data.mentors, now), sort, dir)
  const wk = weekSoFar([], now)
  const keep = new URLSearchParams()
  if (q.sort) keep.set('sort', sort)
  if (q.dir) keep.set('dir', dir)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Teams</h1>
          <p>
            {mentor ? `${mentor.name} · ${shown.length} teams` : `${shown.length} teams`} · {inr(cohortRevenue(shown))}
          </p>
        </div>
        <div className="head-tools">
          <MentorPicker
            options={data.mentors.map((m) => ({ value: m.slug, label: m.name }))}
            value={mentor?.slug ?? ''}
            to={{ kind: 'teams', keep: keep.toString() }}
            allLabel="All mentors"
          />
          <Updated readAt={data.readAt} />
        </div>
      </div>

      <section className="card">
        <TeamsTable
          rows={rows}
          sort={sort}
          dir={dir}
          query={mentor ? { mentor: mentor.slug } : {}}
          weekLabel={dayRange(wk.monday, wk.sunday)}
        />
      </section>
    </>
  )
}
