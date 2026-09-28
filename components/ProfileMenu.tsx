'use client'

/**
 * The signed-in person, as initials in the top bar. Clicking shows their name,
 * email and Sign out. Closes on Esc or a click anywhere else.
 */
import { useEffect, useRef, useState } from 'react'

export function initialsOf(name: string | null, email: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export function ProfileMenu({ name, email, signOutAction }: { name: string | null; email: string; signOutAction: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="profile" ref={box}>
      <button className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label={`Account: ${name ?? email}`} onClick={() => setOpen((o) => !o)}>
        {initialsOf(name, email)}
      </button>
      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-who">
            {name && <b>{name}</b>}
            <span>{email}</span>
          </div>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="profile-out">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
