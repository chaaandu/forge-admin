'use client'

/**
 * The search box in the top bar: type a team, student or mentor and jump to
 * their page. ⌘K / Ctrl+K from anywhere; ↑ ↓ to move, Enter to open, Esc to close.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { search, type Entry } from '@/lib/searchIndex'

const KIND: Record<Entry['kind'], string> = { team: 'Team', student: 'Student', mentor: 'Mentor' }

export function GlobalSearch({ index }: { index: Entry[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [hint, setHint] = useState('⌘K')
  useEffect(() => {
    if (!/mac|iphone|ipad/i.test(navigator.userAgent)) setHint('Ctrl K')
  }, [])
  const results = search(index, q)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (e: Entry | undefined) => {
    if (!e) return
    router.push(e.href)
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className="gsearch">
      <input
        ref={input}
        type="search"
        value={q}
        placeholder="Search teams, students, mentors"
        aria-label="Search teams, students and mentors"
        role="combobox"
        aria-expanded={open && q.trim() !== ''}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Let a click on a result land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            go(results[active])
          } else if (e.key === 'Escape') {
            setQ('')
            input.current?.blur()
          }
        }}
      />
      <kbd className="gsearch-kbd" aria-hidden>
        {hint}
      </kbd>
      {open && q.trim() !== '' && (
        <ul className="gsearch-list" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="gsearch-empty">Nothing matches “{q}”</li>
          ) : (
            results.map((e, i) => (
              <li
                key={`${e.kind}-${e.href}-${e.label}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'on' : ''}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(ev) => {
                  ev.preventDefault()
                  go(e)
                }}
              >
                <span className={`gk gk-${e.kind}`}>{KIND[e.kind]}</span>
                <span className="gl">
                  <b>{e.label}</b>
                  <small>{e.sub}</small>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
