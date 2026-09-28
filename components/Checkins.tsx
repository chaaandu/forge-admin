import type { Checkin, Score } from '@/lib/parse'

function ScoreChip({ label, s }: { label: string; s: Score | null }) {
  if (!s) return null
  return (
    <span className="score">
      {label} <b className="num">{s.outOf ? `${s.value}/${s.outOf}` : s.value}</b>
    </span>
  )
}

export function CheckinCard({ c, heading }: { c: Checkin; heading?: React.ReactNode }) {
  const hasScores = c.preparedness || c.dataPitch || c.interpersonal
  return (
    <article className="checkin">
      <header>
        <span className="wk">{heading ?? `Week ${c.week}`}</span>
        {hasScores && (
          <span className="scores">
            <ScoreChip label="Preparedness" s={c.preparedness} />
            <ScoreChip label="Data & pitch" s={c.dataPitch} />
            <ScoreChip label="Interpersonal" s={c.interpersonal} />
          </span>
        )}
      </header>
      {c.notes ? <p className="notes">{c.notes}</p> : <p className="notes sub">Scores only, no notes.</p>}
    </article>
  )
}

/**
 * Every mentor week up to now, newest first. A week with nothing written is
 * shown as such rather than skipped, so a gap reads as a gap.
 */
export function CheckinTimeline({ checkins, throughWeek }: { checkins: Checkin[]; throughWeek: number }) {
  const last = Math.max(throughWeek, ...checkins.map((c) => c.week), 0)
  const weeks: number[] = []
  for (let w = Math.min(last, 8); w >= 1; w--) weeks.push(w)
  return (
    <div className="timeline">
      {weeks.map((w) => {
        const c = checkins.find((x) => x.week === w)
        return c ? (
          <CheckinCard key={w} c={c} />
        ) : (
          <div key={w} className="checkin none">
            <span className="wk">Week {w}</span> <span className="sub">No check-in written</span>
          </div>
        )
      })}
    </div>
  )
}
