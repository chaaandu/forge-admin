'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/teams', label: 'Teams' },
  { href: '/mentors', label: 'Mentors' },
  { href: '/compare', label: 'Compare' },
]

export function NavLinks() {
  // Without the /admin basePath: '/', '/teams/VBC101', '/mentors/<slug>'.
  const path = usePathname()
  const current = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'))
  return (
    <nav className="nav">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={current(n.href) ? 'page' : undefined}>
          {n.label}
        </Link>
      ))}
    </nav>
  )
}
