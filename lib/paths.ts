/**
 * Paths as the proxy sees them. Pure.
 *
 * Next strips the `/admin` basePath from `nextUrl.pathname` — except when
 * Auth.js has rebuilt the request from AUTH_URL (production), where the prefix
 * is still there. Both shapes must mean the same page, or production sends
 * every signed-out visitor to `/login` on the wall's domain.
 */
export const BASE = '/admin'

/** `/admin/teams` and `/teams` → `/teams`; `/admin` and `/` → `/`. */
export function appPath(pathname: string): string {
  if (pathname === BASE) return '/'
  if (pathname.startsWith(BASE + '/')) return pathname.slice(BASE.length)
  return pathname
}

/** Pages a signed-out visitor may reach: the login page and the sign-in routes themselves. */
export function isPublicPath(pathname: string): boolean {
  const p = appPath(pathname)
  return p === '/login' || p === '/api/auth' || p.startsWith('/api/auth/')
}
