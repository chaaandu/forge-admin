import { day, inr } from '@/lib/format'
import type { weekSoFar } from '@/lib/metrics'

/**
 * The line under "This week so far": finished days this week against the same
 * days last week. On a Monday nothing is finished, so it shows last week instead.
 */
export function WeekDelta({ week }: { week: ReturnType<typeof weekSoFar> }) {
  if (week.daysDone === 0) {
    return (
      <div className="kpi-sub">
        last week <b>{inr(week.lastWeekFull)}</b>
      </div>
    )
  }
  if (!week.lastWeekDone) {
    return <div className="kpi-sub">nothing sold same days last week</div>
  }
  const change = (week.thisWeekDone - week.lastWeekDone) / week.lastWeekDone
  const tone = change > 0.005 ? 'up' : change < -0.005 ? 'down' : 'flat'
  // Finished days only: on a Wednesday that is Mon–Tue.
  const lastDone = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][week.daysDone - 1]
  const span = week.daysDone === 1 ? 'Mon' : `Mon–${lastDone}`
  return (
    <div className="kpi-sub">
      <span className={`delta ${tone}`}>
        {tone === 'up' ? '▲' : tone === 'down' ? '▼' : ''} {Math.abs(change * 100).toFixed(0)}%
      </span>{' '}
      {span} vs last week
    </div>
  )
}

/** "This week" with the dates it covers: sales weeks run Monday to Sunday. */
export function ThisWeekLabel({ week }: { week: ReturnType<typeof weekSoFar> }) {
  return (
    <div className="kpi-label">
      This week <span className="kpi-range">Mon {day(week.monday)} – Sun {day(week.sunday)}</span>
    </div>
  )
}
