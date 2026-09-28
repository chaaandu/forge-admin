/** Shown while a page reads the sheets: the page's shape, not a spinner. */
export default function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      <div className="sk sk-title" />
      <div className="grid g-kpi">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="card sk sk-kpi" />
        ))}
      </div>
      <div className="stack">
        <div className="grid g-3">
          <div className="card sk sk-chart" />
          <div className="card sk sk-chart" />
        </div>
      </div>
    </div>
  )
}
