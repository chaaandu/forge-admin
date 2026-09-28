'use client'

/**
 * Choose the teams to compare: search by name, ID or product and add; remove
 * with ×. The choice lives in the URL (`?teams=VBC121,VBC126`), so a comparison
 * can be shared or bookmarked.
 */
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { MAX_COMPARE } from '@/lib/compare'
import { fold } from '@/lib/searchIndex'

type Option = { id: string; venture: string; product: string }

export function TeamPicker({ all, selected }: { all: Option[]; selected: string[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const set = (ids: string[]) => router.replace(ids.length ? `/compare?teams=${ids.join(',')}` : '/compare', { scroll: false })
  const words = fold(q).split(' ').filter(Boolean)
  const options = all
    .filter((o) => !selected.includes(o.id))
    .filter((o) => words.every((w) => fold(`${o.venture} ${o.id} ${o.product}`).includes(w)))
    .slice(0, 8)
  const byId = new Map(all.map((o) => [o.id, o]))
  const full = selected.length >= MAX_COMPARE

  const add = (o: Option | undefined) => {
    if (!o || full) return
    set([...selected, o.id])
    setQ('')
    setActive(0)
    // Keep the box open for the next team, unless that was the last slot.
    if (selected.length + 1 >= MAX_COMPARE) {
      setOpen(false)
      input.current?.blur()
    }
  }

  return (
    <div className="picker-row">
      {selected.map((id, i) => (
        <span key={id} className="chip">
          <span className={`cmp-sw cmp-${i + 1}`} />
          {byId.get(id)?.venture || id}
          <small>{id}</small>
          <button aria-label={`Remove ${byId.get(id)?.venture || id}`} onClick={() => set(selected.filter((x) => x !== id))}>
            ×
          </button>
        </span>
      ))}
      {full ? (
        <span className="sub">Up to {MAX_COMPARE} teams. Remove one to add another.</span>
      ) : (
        <div className="tpick">
          <input
            ref={input}
            type="search"
            value={q}
            placeholder={selected.length === 0 ? 'Search a team to compare' : 'Add another team'}
            aria-label="Add a team to compare"
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, options.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                add(options[active])
              } else if (e.key === 'Backspace' && q === '' && selected.length) {
                set(selected.slice(0, -1))
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
          {open && (
            <ul className="gsearch-list tpick-list" role="listbox">
              {options.length === 0 ? (
                <li className="gsearch-empty">No team matches “{q}”</li>
              ) : (
                options.map((o, i) => (
                  <li
                    key={o.id}
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? 'on' : ''}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      add(o)
                    }}
                  >
                    <span className="gl">
                      <b>{o.venture || o.id}</b>
                      <small>{[o.id, o.product].filter(Boolean).join(' · ')}</small>
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
