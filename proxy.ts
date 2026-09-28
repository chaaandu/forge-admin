/**
 * Sends signed-out visitors to the login page before a page starts rendering.
 * An early courtesy, not the lock: `lib/session.ts` is checked again by every
 * page before any sheet is read.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { isStaffEmail } from '@/lib/staff'

export default auth((req) => {
  // nextUrl.pathname is without the /admin basePath.
  const path = req.nextUrl.pathname
  if (path === '/login' || path.startsWith('/api/auth')) return
  if (!isStaffEmail(req.auth?.user?.email)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
})

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
