'use client'

/**
 * Keeps an open page current: every 60 seconds, while the tab is visible, the
 * server page is re-rendered in place (`router.refresh()`), which is no reload,
 * no flicker, and keeps scroll, typed searches and open dropdowns.
 *
 * 60 seconds matches the server's own cache (`TTL_MS` in `lib/sheets.ts`), so
 * refreshing faster would only re-send the same figures. A hidden tab makes no
 * requests; when it comes back after more than a minute it refreshes at once,
 * so a laptop waking up shows today's numbers rather than last night's.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

const EVERY_MS = 60_000

export function AutoRefresh() {
  const router = useRouter()
  const last = useRef(Date.now())

  useEffect(() => {
    const refresh = () => {
      last.current = Date.now()
      router.refresh()
    }
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last.current > EVERY_MS) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  return null
}
