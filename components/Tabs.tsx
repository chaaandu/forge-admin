'use client'

import { useState } from 'react'

/** Tabs over panels the server has already rendered; switching shows another, nothing is fetched. */
export function Tabs({ labels, children }: { labels: string[]; children: React.ReactNode[] }) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div className="tabs" role="tablist">
        {labels.map((l, i) => (
          <button key={l} role="tab" aria-selected={i === active} className={i === active ? 'on' : ''} onClick={() => setActive(i)}>
            {l}
          </button>
        ))}
      </div>
      <div role="tabpanel">{children[active]}</div>
    </div>
  )
}
