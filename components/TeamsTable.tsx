'use client'

/**
 * The teams table with search. Sorting is a link (it lives in the URL, so a
 * sorted view can be shared); search is instant and local, over rows that
 * carry no notes — see `lib/teamRows.ts`.
 */
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { inr } from '@/lib/format'
import { CHANNELS } from '@/lib/metrics'
import { DEFAULT_DIR, matches, type Dir, type SortKey, type TeamRow } from '@/lib/teamRows'
import { Assessment, MentorLink, Pace, TeamLink } from './tables'

function MiniChannels({ r }: { r: TeamRow }) {
  const on = CHANNELS.filter((c) => r.channels[c.key] > 0)
  if (on.length === 0) return <span className="sub">–</span>
  return (
    <span className="mini-stack tip-host" tabIndex={0}>
      {on.map((c) => (
        <i key={c.key} className={`ch-${c.key}`} style={{ flex: r.channels[c.key] }} />
      ))}
      <span className="tip">
        {on.map((c) => (
          <span key={c.key} className="tip-row">
            <span className={`sw ch-${c.key}`} /> {c.label} <b>{inr(r.channels[c.key])}</b>
          </span>
        ))}
      </span>
    </span>
  )
}

export function TeamsTable({
  rows,
  sort,
  dir,
  query,
  weekLabel,
  showMentor = true,
}: {
  rows: TeamRow[]
  sort: SortKey
  dir: Dir
  /** Other query parameters to keep on the heading links (e.g. the mentor filter). */
  query?: Record<string, string>
  /** The calendar week "This week" covers, e.g. "28 Sep – 4 Oct". */
  weekLabel: string
  showMentor?: boolean
}) {
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)

  // "/" jumps to the search box, as on most sites with one.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (e.key === '/' && !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shown = rows.filter((r) => matches(r, q))
  const max = Math.max(1, ...rows.map((r) => r.revenue))

  const Head = ({ k, label, right, sub }: { k: SortKey; label: string; right?: boolean; sub?: string }) => {
    const active = sort === k
    const next: Dir = active ? (dir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR[k]
    return (
      <th className={`${right ? 'r ' : ''}sortable${active ? ' on' : ''}`} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <Link href={{ query: { ...query, sort: k, dir: next } }} scroll={false} replace>
          {label}
          {active && <span aria-hidden>{dir === 'asc' ? ' ↑' : ' ↓'}</span>}
          {sub && <small>{sub}</small>}
        </Link>
      </th>
    )
  }

  return (
    <div>
      <div className="search">
        <input
          ref={input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQ('')}
          placeholder="Search teams, products, students or mentors"
          aria-label="Search teams"
        />
        {q.trim() && <span className="search-count">{`${shown.length} of ${rows.length}`}</span>}
      </div>

      {shown.length === 0 ? (
        <div className="empty">No team matches “{q}”.</div>
      ) : (
        <div className="table-scroll">
          <table className="t teams">
            <thead>
              <tr>
                <th className="rank">#</th>
                <Head k="venture" label="Team" />
                {showMentor && <Head k="mentor" label="Mentor" />}
                <Head k="revenue" label="Revenue" right />
                <Head k="week" label="This week" sub={weekLabel} right />
                <Head k="units" label="Units" right />
                <Head k="orders" label="Orders" right />
                <Head k="aov" label="Avg order" right />
                <th>Channels</th>
                <Head k="pace" label="Pace" />
                <Head k="assessment" label="Mentor says" />
                <Head k="checkin" label="Last check-in" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="row-link">
                  <td className="rank num">{r.rank}</td>
                  <td className="cell-team">
                    <TeamLink t={r} product main />
                  </td>
                  {showMentor && (
                    <td className="sub" data-label="Mentor">
                      <MentorLink m={r.mentor} />
                    </td>
                  )}
                  <td className="fig num" data-label="Revenue">
                    {inr(r.revenue)}
                    <span className="inline-bar">
                      <i style={{ width: `${(r.revenue / max) * 100}%` }} />
                    </span>
                  </td>
                  <td className={`fig num${r.thisWeek ? '' : ' zero'}`} data-label="This week">
                    {inr(r.thisWeek)}
                  </td>
                  <td className="fig num hide-sm" data-label="Units">
                    {r.units.toLocaleString('en-IN')}
                  </td>
                  <td className="fig num hide-sm" data-label="Orders">
                    {r.orders.toLocaleString('en-IN')}
                  </td>
                  <td className="fig num hide-sm" data-label="Avg order">
                    {inr(r.aov)}
                  </td>
                  <td className="hide-sm" data-label="Channels">
                    <MiniChannels r={r} />
                  </td>
                  <td data-label="Pace">
                    <Pace value={r.pace} />
                  </td>
                  <td data-label="Mentor says">
                    <Assessment value={r.assessment} />
                  </td>
                  <td className="sub" data-label="Last check-in">
                    {r.lastCheckin ? `Week ${r.lastCheckin}` : 'None yet'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
