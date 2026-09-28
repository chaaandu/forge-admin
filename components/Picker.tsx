'use client'

/**
 * The mentor dropdown. The only client component: it navigates, nothing more.
 * Every figure on the page is still rendered on the server.
 */
import { useRouter } from 'next/navigation'

type Option = { value: string; label: string }

export function MentorPicker({
  options,
  value,
  to,
  allLabel,
}: {
  options: Option[]
  value: string
  /** `mentor`: go to that mentor's page. `teams`: filter the teams page, keeping `keep` (its sort). */
  to: { kind: 'mentor' } | { kind: 'teams'; keep: string }
  /** When set, offers an "all" choice with this label and value ''. */
  allLabel?: string
}) {
  const router = useRouter()
  return (
    <label className="picker">
      <select
        aria-label="Mentor"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (to.kind === 'mentor') router.push(v ? `/mentors/${v}` : '/mentors')
          else {
            const q = new URLSearchParams(to.keep)
            if (v) q.set('mentor', v)
            else q.delete('mentor')
            const s = q.toString()
            router.push(`/teams${s ? `?${s}` : ''}`)
          }
        }}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
