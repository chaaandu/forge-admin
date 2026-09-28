/**
 * Check-in history at a glance: who has notes for which mentor week. Each
 * column is labelled with its dates, because mentor weeks run Tuesday to
 * Monday (the sheet counts from 1 September) and a bare "Wk 4" hides that.
 */
import { dayRange } from '@/lib/format'
import type { checkinGrid, mentorCheckinGrid } from '@/lib/metrics'
import { mentorWeekRange } from '@/lib/metrics'
import { ScrollToLatest } from './ScrollToLatest'
import { MentorLink, TeamLink } from './tables'

function WeekHead({ w, current }: { w: number; current: number }) {
  const r = mentorWeekRange(w)
  return (
    <th className={`wk-col${w === current ? ' now' : ''}`}>
      Wk {w}
      <small>{dayRange(r.start, r.end)}</small>
    </th>
  )
}

/** Rows are teams, columns are mentor weeks; a filled dot is a written check-in. */
export function TeamCheckinGrid({ grid, current }: { grid: ReturnType<typeof checkinGrid>; current: number }) {
  return (
    <ScrollToLatest>
      <table className="t grid-t">
        <thead>
          <tr>
            <th>Team</th>
            {grid.weeks.map((w) => (
              <WeekHead key={w} w={w} current={current} />
            ))}
            <th className="r">Weeks</th>
          </tr>
        </thead>
        <tbody>
          {grid.rows.map(({ team, cells }, row) => (
            // The grid scrolls, so it clips: notes on the lower half open upward.
            <tr key={team.id} className={row >= grid.rows.length / 2 ? 'tips-up' : ''}>
              <td>
                <TeamLink t={team} />
              </td>
              {cells.map((c, i) => {
                const w = grid.weeks[i]
                const scores = c && [c.preparedness, c.dataPitch, c.interpersonal].filter(Boolean).map((s) => s!.value)
                return (
                  <td key={w} className={`dot-cell${w === current ? ' now' : ''}`}>
                    {c ? (
                      <span className="dot on tip-host" tabIndex={0} aria-label={`Week ${w}: check-in written`}>
                        <span className="tip">
                          <b>Week {w}</b>
                          {scores && scores.length > 0 && <span className="tip-muted"> · scores {scores.join(' / ')}</span>}
                          {c.notes && <span className="tip-note">{c.notes.length > 140 ? c.notes.slice(0, 140) + '…' : c.notes}</span>}
                        </span>
                      </span>
                    ) : (
                      <span className="dot" aria-label={`Week ${w}: no check-in`} />
                    )}
                  </td>
                )
              })}
              <td className="fig num">
                {cells.filter(Boolean).length}/{cells.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollToLatest>
  )
}

function heat(n: number, of: number): string {
  if (!of || n === 0) return 'h0'
  const share = n / of
  return share >= 1 ? 'h4' : share > 0.66 ? 'h3' : share > 0.33 ? 'h2' : 'h1'
}

/** Rows are mentors, columns are mentor weeks; each cell is how many of their teams have notes that week. */
export function MentorCheckinGrid({ grid, current }: { grid: ReturnType<typeof mentorCheckinGrid>; current: number }) {
  return (
    <ScrollToLatest>
      <table className="t grid-t">
        <thead>
          <tr>
            <th>Mentor</th>
            {grid.weeks.map((w) => (
              <WeekHead key={w} w={w} current={current} />
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map(({ mentor, teams, cells }) => (
            <tr key={mentor.slug}>
              <td>
                <MentorLink m={mentor} />
              </td>
              {cells.map((n, i) => (
                <td key={grid.weeks[i]} className={grid.weeks[i] === current ? 'now' : ''}>
                  <span className={`heat ${heat(n, teams)}`}>
                    {n}/{teams}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollToLatest>
  )
}
