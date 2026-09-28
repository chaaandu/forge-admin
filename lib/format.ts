const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹21,27,388 — Indian grouping, whole rupees. */
export function inr(n: number): string {
  return '₹' + INR.format(Math.round(n))
}

/** ₹21.3L, ₹1.48 Cr, ₹12.5K — for axes and headline figures where the full figure is shown nearby. */
export function inrShort(n: number): string {
  const a = Math.abs(n)
  const trim = (x: number, d: number) => x.toFixed(d).replace(/\.0+$|(\.\d*?)0+$/, '$1')
  if (a >= 1e7) return `₹${trim(n / 1e7, 2)} Cr`
  if (a >= 1e5) return `₹${trim(n / 1e5, 1)}L`
  if (a >= 1e3) return `₹${trim(n / 1e3, 1)}K`
  return inr(n)
}

export function pct(part: number, whole: number, digits = 0): string {
  if (!whole) return '0%'
  return `${((part / whole) * 100).toFixed(digits)}%`
}

// Dates are formatted by hand: Intl writes "Sept" in some runtimes and "Sep" in others,
// and the same date must never print two ways on one page.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const parts = (date: string) => {
  const d = new Date(date + 'T00:00:00Z')
  return { day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], dow: DAYS[d.getUTCDay()], m: d.getUTCMonth() }
}

/** `2026-09-15` → `15 Sep`. */
export function day(date: string): string {
  const p = parts(date)
  return `${p.day} ${p.month}`
}

/** `2026-09-15` → `Tue, 15 Sep`. */
export function weekday(date: string): string {
  const p = parts(date)
  return `${p.dow}, ${p.day} ${p.month}`
}

const TIME = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

/** A timestamp as IST clock time: `10:42 am`. */
export function istTime(ms: number): string {
  return TIME.format(new Date(ms))
}

/** `2026-09-22`, `2026-09-28` → `22–28 Sep`; across months → `28 Sep – 4 Oct`. */
export function dayRange(start: string, end: string): string {
  const a = parts(start)
  const b = parts(end)
  if (a.m === b.m) return `${a.day}–${b.day} ${b.month}`
  return `${a.day} ${a.month} – ${b.day} ${b.month}`
}
