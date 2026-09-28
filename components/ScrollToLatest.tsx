'use client'

/**
 * A sideways-scrolling box that opens at its right-hand end. Week grids grow a
 * column a week; the newest weeks are the ones that matter, so they are what
 * shows first, and older weeks are a scroll to the left.
 */
import { useEffect, useRef } from 'react'

export function ScrollToLatest({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])
  return (
    <div className="table-scroll week-scroll" ref={box}>
      {children}
    </div>
  )
}
