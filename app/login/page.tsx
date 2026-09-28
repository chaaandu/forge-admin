import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { isStaffEmail } from '@/lib/staff'

export const metadata: Metadata = { title: 'Sign in' }

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth()
  if (isStaffEmail(session?.user?.email)) redirect('/')
  const { error } = await searchParams

  return (
    <div className="login">
      <div className="login-card">
        <h1>Forge C1 · Staff</h1>
        <p>Sign in with your @mesaschool.co account.</p>
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/admin' })
          }}
        >
          <button type="submit">Continue with Google</button>
        </form>
        {error === 'AccessDenied' && (
          <div className="login-err">This dashboard is for @mesaschool.co staff accounts only.</div>
        )}
        {error && error !== 'AccessDenied' && <div className="login-err">Sign-in didn’t complete ({error}). Try again.</div>}
      </div>
    </div>
  )
}
