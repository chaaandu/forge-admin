/**
 * Server-rendered charts in plain HTML/CSS. Hover and keyboard focus both show
 * the tooltip; there is no client JavaScript.
 */
import { day, dayRange, inr, inrShort, pct, weekday } from '@/lib/format'
import { programmeWeekRange } from '@/lib/metrics'
import type { Channels, Team } from '@/lib/parse'

/** A round step for gridlines: 1, 2 or 5 × a power of ten. */
export function niceStep(max: number, lines: number): number {
  const raw = max / lines
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  for (const m of [1, 2, 5, 10]) if (m * pow >= raw) return m * pow
  return 10 * pow
}

type Column = { key: string; axis: string; tip: string; value: number }

/** Vertical bars on a shared baseline, with round gridlines and a tooltip per bar. */
export function Columns({ items, empty = 'No sales yet.' }: { items: Column[]; empty?: string }) {
  if (items.length === 0 || items.every((c) => c.value === 0)) return <div className="empty">{empty}</div>
  const peak = Math.max(...items.map((d) => d.value))
  const step = niceStep(peak, 4)
  const top = Math.max(step, Math.ceil(peak / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)

  return (
    <div>
      <div className="cols">
        <div className="cols-grid" aria-hidden>
          {ticks.map((v) => (
            <div key={v} className={v === 0 ? 'base' : ''} style={{ bottom: `${(v / top) * 100}%` }}>
              <span>{inrShort(v)}</span>
            </div>
          ))}
        </div>
        <div className="cols-bars" role="list">
          {items.map((d, i) => (
            <div
              key={d.key}
              role="listitem"
              tabIndex={0}
              // Tooltips near either edge open inward, so none can run off the screen.
              className={`col tip-host${d.value ? '' : ' zero'}${i < items.length * 0.2 ? ' tip-start' : i >= items.length * 0.8 ? ' tip-end' : ''}`}
              aria-label={`${d.tip}: ${inr(d.value)}`}
            >
              <i style={{ height: `${(d.value / top) * 100}%` }} />
              <div className="tip">
                <span className="tip-muted">{d.tip}</span>
                <br />
                <b>{inr(d.value)}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cols-x" aria-hidden>
        {items.map((d) => (
          <span key={d.key}>{d.axis}</span>
        ))}
      </div>
    </div>
  )
}

/** Revenue per day. Only Mondays are labelled, so labels never collide however many days there are. */
export function DailyColumns({ days }: { days: { date: string; revenue: number }[] }) {
  const isMonday = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay() === 1
  return (
    <Columns
      items={days.map((d) => ({ key: d.date, axis: isMonday(d.date) ? day(d.date) : '', tip: weekday(d.date), value: d.revenue }))}
    />
  )
}

/** Revenue per programme week, weeks 1 to `through`. */
export function WeeklyColumns({ weekly, through }: { weekly: Record<number, number>; through: number }) {
  const items: Column[] = []
  for (let w = 1; w <= through; w++) {
    const r = programmeWeekRange(w)
    items.push({ key: String(w), axis: `Wk ${w}`, tip: `Week ${w} · ${dayRange(r.start, r.end)}`, value: weekly[w] ?? 0 })
  }
  return <Columns items={items} />
}

export function BucketBars({ rows }: { rows: { label: string; hint: string; teams: Team[] }[] }) {
  const most = Math.max(1, ...rows.map((r) => r.teams.length))
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.label} className="hbar tip-host" tabIndex={0} aria-label={`${r.label} (${r.hint}): ${r.teams.length} teams`}>
          <div className="hbar-label">
            {r.label}
            <small>{r.hint}</small>
          </div>
          <div className="hbar-track">
            <i style={{ width: `${(r.teams.length / most) * 100}%` }} />
          </div>
          <div className="hbar-n num">{r.teams.length}</div>
          <div className="tip">
            {r.teams.length === 0 ? (
              <span className="tip-muted">No teams</span>
            ) : (
              r.teams.map((t) => (
                <div key={t.id}>
                  <b>{t.venture}</b> <span className="tip-muted">{inr(t.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChannelStack({ rows }: { rows: { key: keyof Channels; label: string; revenue: number }[] }) {
  const total = rows.reduce((a, r) => a + r.revenue, 0)
  const shown = rows.filter((r) => r.revenue > 0)
  // A segment whose middle is in the right half opens its tooltip leftward, so it never runs off the page.
  let start = 0
  const segs = shown.map((r) => {
    const right = (start + r.revenue / 2) / total > 0.5
    start += r.revenue
    return { ...r, right }
  })
  return (
    <div>
      <div className="stackbar" role="img" aria-label="Revenue by channel">
        {segs.map((r) => (
          <div key={r.key} className={`seg tip-host ch-${r.key}${r.right ? ' tip-left' : ''}`} tabIndex={0} style={{ flex: r.revenue }}>
            <div className="tip">
              <b>{r.label}</b> · {inr(r.revenue)} <span className="tip-muted">({pct(r.revenue, total, 1)})</span>
            </div>
          </div>
        ))}
      </div>
      <ul className="legend">
        {rows.map((r) => (
          <li key={r.key} className={r.revenue ? '' : 'nil'}>
            <span className={`sw ch-${r.key}`} aria-hidden />
            <span className="name">{r.label}</span>
            <span className="v num">{inr(r.revenue)}</span>
            <span className="p num">{pct(r.revenue, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
