/**
 * Sends signed-out visitors to the login page before a page starts rendering.
 * An early courtesy, not the lock: `lib/session.ts` is checked again by every
 * page before any sheet is read.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { BASE, isPublicPath } from '@/lib/paths'
import { isStaffEmail } from '@/lib/staff'

export default auth((req) => {
  // In production Auth.js rebuilds `req` from AUTH_URL, which keeps the /admin
  // prefix on the path and the public domain on the origin; locally it does
  // neither. `isPublicPath` reads both shapes, and the redirect is spelled out
  // in full so it lands on /admin/login either way.
  if (isPublicPath(req.nextUrl.pathname)) return
  if (!isStaffEmail(req.auth?.user?.email)) {
    return NextResponse.redirect(new URL(`${BASE}/login`, req.nextUrl.origin))
  }
})

export const config = {
  // Everything except Next's own assets and the tab icons, which the sign-in page shows too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)'],
}
