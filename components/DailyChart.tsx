'use client'

/**
 * Revenue by day, with the span it covers said in words and a switch for the
 * last 7, 14 or 30 days. The server sends every day since the cohort's first
 * sale; the switch only slices it, so nothing is fetched.
 */
import { useState } from 'react'
import { dayRange } from '@/lib/format'
import { DailyColumns } from './charts'

const SPANS = [7, 14, 30]

export function DailyChart({ title, days }: { title: string; days: { date: string; revenue: number }[] }) {
  // Offer only the spans shorter than what exists; "All" covers the rest.
  const spans = SPANS.filter((n) => n < days.length)
  const [span, setSpan] = useState<number | null>(null)
  const shown = span ? days.slice(-span) : days
  const range = shown.length ? dayRange(shown[0].date, shown[shown.length - 1].date) : ''

  return (
    <div className="card">
      <div className="card-h chart-h">
        <div>
          <h2>{title}</h2>
          {shown.length > 0 && (
            <div className="chart-span">
              {span ? `Last ${shown.length} days` : `All ${shown.length} days`} · {range}
            </div>
          )}
        </div>
        {spans.length > 0 && (
          <div className="seg-ctl" role="group" aria-label="Days shown">
            {spans.map((n) => (
              <button key={n} className={span === n ? 'on' : ''} aria-pressed={span === n} onClick={() => setSpan(n)}>
                {n}d
              </button>
            ))}
            <button className={span === null ? 'on' : ''} aria-pressed={span === null} onClick={() => setSpan(null)}>
              All
            </button>
          </div>
        )}
      </div>
      <DailyColumns days={shown} />
    </div>
  )
}
