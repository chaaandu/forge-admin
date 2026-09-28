/**
 * A venture's own links, from cells forty teams type into. Untrusted input:
 * the only schemes that leave here are http and https, so a `javascript:` cell
 * can never become an href on a page staff are signed in to.
 */

/** `houseofpravaah.com` → `https://houseofpravaah.com`; anything with another scheme → null. */
export function websiteUrl(cell: string): string | null {
  const s = cell.trim()
  if (!s) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!u.hostname.includes('.')) return null
    return u.href
  } catch {
    return null
  }
}

/** Any of the shapes people write an Instagram account in → the profile URL, tracking parameters dropped. */
export function instagramUrl(cell: string): string | null {
  const s = cell.trim()
  if (!s) return null
  const handle = s.match(/^@?([A-Za-z0-9._]{1,30})$/)
  if (handle) return `https://www.instagram.com/${handle[1]}/`
  const url = websiteUrl(s)
  if (!url) return null
  const u = new URL(url)
  if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null
  const name = u.pathname.split('/').filter(Boolean)[0]
  return name ? `https://www.instagram.com/${name}/` : null
}

/** What to print for a link: the host and path without the scheme or a trailing slash. */
export function linkLabel(url: string): string {
  const u = new URL(url)
  return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '')
}
