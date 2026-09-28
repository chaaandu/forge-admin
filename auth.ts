/**
 * Google sign-in. Sessions are signed cookies (JWT); there is no database.
 *
 * Two gates, and the second is the one that matters:
 *  - the OAuth app is Internal, so only Mesa's Workspace can reach Google's screen;
 *  - `isStaffEmail` refuses everything but exactly `@mesaschool.co`, which is
 *    what keeps students (`@forge27.mesaschool.co`, same Workspace) out.
 *
 * `basePath` includes Next's `/admin` because every URL this app owns lives
 * under it. In production behind the wall's rewrite, AUTH_URL must be set to
 * https://fb.mesaschool.co.in/admin/api/auth so Google is sent back to the
 * public address rather than the deployment's own host.
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { isStaffEmail } from './lib/staff.ts'

export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/admin/api/auth',
  trustHost: true,
  providers: [Google],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/admin/login', error: '/admin/login' },
  callbacks: {
    signIn({ profile }) {
      return profile?.email_verified === true && isStaffEmail(profile.email)
    },
  },
})
