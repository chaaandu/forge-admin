/**
 * The gate every page passes through before it may read a sheet.
 *
 * `proxy.ts` turns signed-out visitors away early, but Next's own guidance is
 * that a proxy is an optimistic check, not the authority. This is the
 * authority: the data is only ever reached through `staffDashboard()`.
 */
import 'server-only'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getDashboard, type LiveDashboard } from './sheets.ts'
import { isStaffEmail } from './staff.ts'

export async function requireStaff(): Promise<{ email: string; name: string | null }> {
  const session = await auth()
  const email = session?.user?.email
  if (!email || !isStaffEmail(email)) redirect('/login')
  return { email, name: session.user?.name ?? null }
}

/**
 * A failed read comes back as a message rather than a thrown error, because in
 * production Next hides a thrown error's text — and "Daily Team Summary: no
 * "B2B ₹" column" is exactly what the person looking at the page needs to read.
 */
export async function staffDashboard(): Promise<
  { user: Awaited<ReturnType<typeof requireStaff>> } & ({ data: LiveDashboard; error: null } | { data: null; error: string })
> {
  const user = await requireStaff()
  try {
    return { user, data: await getDashboard(), error: null }
  } catch (e) {
    return { user, data: null, error: e instanceof Error ? e.message : String(e) }
  }
}
