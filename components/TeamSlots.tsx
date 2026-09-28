'use client'

/**
 * Three slots, one per team, in the same colours and order as the chart lines
 * and table columns below. A filled slot shows the team; an empty one is a
 * button that turns into a search box. The choice lives in the URL
 * (`?teams=VBC121,VBC126`), so a comparison can be shared or bookmarked.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MAX_COMPARE } from '@/lib/compare'
import { fold } from '@/lib/searchIndex'

export type SlotOption = { id: string; venture: string; product: string; mentor: string }

export function TeamSlots({ all, selected }: { all: SlotOption[]; selected: string[] }) {
  const router = useRouter()
  const byId = new Map(all.map((o) => [o.id, o]))
  // The slot being searched in. Nothing opens by itself on arrival, so the starters stay visible.
  const [editing, setEditing] = useState<number | null>(null)
  const set = (ids: string[]) => router.replace(ids.length ? `/compare?teams=${ids.join(',')}` : '/compare', { scroll: false })

  return (
    <div className="slots">
      {Array.from({ length: MAX_COMPARE }, (_, i) => {
        const id = selected[i]
        const o = id ? byId.get(id) : undefined
        if (o) {
          return (
            <div key={i} className={`slot filled cmp-${i + 1}`}>
              <div className="slot-main">
                <b>{o.venture || o.id}</b>
                <small>
                  {o.id}
                  {o.mentor ? ` · ${o.mentor}` : ''}
                </small>
              </div>
              <button className="slot-x" aria-label={`Remove ${o.venture || o.id}`} onClick={() => set(selected.filter((x) => x !== id))}>
                ×
              </button>
            </div>
          )
        }
        // Only the first open slot can be filled next, so the order of teams matches the slots.
        const next = i === selected.length
        if (next && editing !== null) {
          return (
            <SlotSearch
              key={i}
              slot={i}
              options={all.filter((x) => !selected.includes(x.id))}
              onPick={(pick) => {
                set([...selected, pick])
                // After the first team, open the second slot: one team is not a comparison yet.
                // After the second, stop: two already is, and a third is optional.
                setEditing(selected.length === 0 ? 1 : null)
              }}
              onClose={() => setEditing(null)}
            />
          )
        }
        return (
          <button key={i} className={`slot empty${next ? '' : ' later'}`} disabled={!next} onClick={() => setEditing(i)}>
            <span className={`slot-dot cmp-${i + 1}`} />
            {next ? (selected.length === 0 ? 'Add a team' : 'Add another team') : `Team ${i + 1}`}
          </button>
        )
      })}
    </div>
  )
}

function SlotSearch({
  slot,
  options,
  onPick,
  onClose,
}: {
  slot: number
  options: SlotOption[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const words = fold(q).split(' ').filter(Boolean)
  const shown = options.filter((o) => words.every((w) => fold(`${o.venture} ${o.id} ${o.product} ${o.mentor}`).includes(w))).slice(0, 8)

  return (
    <div className={`slot searching cmp-${slot + 1}`}>
      <input
        ref={input}
        type="search"
        value={q}
        placeholder="Type a team, ID or product"
        aria-label={`Team ${slot + 1}`}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
        }}
        onBlur={() => setTimeout(onClose, 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, shown.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && shown[active]) {
            e.preventDefault()
            onPick(shown[active].id)
          } else if (e.key === 'Escape') {
            onClose()
          }
        }}
      />
      <ul className="gsearch-list slot-list" role="listbox">
        {shown.length === 0 ? (
          <li className="gsearch-empty">No team matches “{q}”</li>
        ) : (
          shown.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'on' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(ev) => {
                ev.preventDefault()
                onPick(o.id)
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
    </div>
  )
}
