'use client'

/**
 * Revenue so far, one line per team, on one axis. Hovering shows every team's
 * figure for that day. Lines are 2px; colours are the validated first three
 * categorical slots, and each line is named in the legend and the table below,
 * so no team is told apart by colour alone.
 */
import { useRef, useState } from 'react'
import { inr, inrShort, weekday, day } from '@/lib/format'
import { niceStep } from './charts'

export type Series = { id: string; label: string; slot: number; values: number[] }

export function CompareChart({ days, series }: { days: string[]; series: Series[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  if (days.length < 2 || series.length === 0) return <div className="empty">No sales yet.</div>

  const peak = Math.max(1, ...series.flatMap((s) => s.values))
  const step = niceStep(peak, 4)
  const top = Math.ceil(peak / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  const x = (i: number) => (i / (days.length - 1)) * 100
  const y = (v: number) => 100 - (v / top) * 100
  const isMonday = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay() === 1

  const onMove = (e: React.MouseEvent) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const i = Math.round(((e.clientX - r.left) / r.width) * (days.length - 1))
    setHover(Math.max(0, Math.min(days.length - 1, i)))
  }

  return (
    <div>
      <ul className="cmp-legend">
        {series.map((s) => (
          <li key={s.id}>
            <span className={`cmp-sw cmp-${s.slot}`} />
            {s.label}
            <b className="num">{inr(s.values[s.values.length - 1])}</b>
          </li>
        ))}
      </ul>
      <div className="lines">
        <div className="cols-grid" aria-hidden>
          {ticks.map((v) => (
            <div key={v} className={v === 0 ? 'base' : ''} style={{ bottom: `${(v / top) * 100}%` }}>
              <span>{inrShort(v)}</span>
            </div>
          ))}
        </div>
        <div className="lines-plot" ref={box} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Revenue so far by team" role="img">
            {series.map((s) => (
              <polyline
                key={s.id}
                className={`cmp-line cmp-${s.slot}`}
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {hover !== null && (
            <>
              <div className="cross" style={{ left: `${x(hover)}%` }} />
              {series.map((s) => (
                <span key={s.id} className={`cmp-dot cmp-${s.slot}`} style={{ left: `${x(hover)}%`, top: `${y(s.values[hover])}%` }} />
              ))}
              <div className={`lines-tip${x(hover) > 60 ? ' flip' : ''}`} style={{ left: `${x(hover)}%` }}>
                <span className="tip-muted">{weekday(days[hover])}</span>
                {[...series]
                  .sort((a, b) => b.values[hover] - a.values[hover])
                  .map((s) => (
                    <span key={s.id} className="tip-row">
                      <span className={`cmp-sw cmp-${s.slot}`} /> {s.label} <b>{inr(s.values[hover])}</b>
                    </span>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="cols-x lines-x" aria-hidden>
        {days.map((d) => (
          <span key={d}>{isMonday(d) ? day(d) : ''}</span>
        ))}
      </div>
    </div>
  )
}
