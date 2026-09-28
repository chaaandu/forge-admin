import Image from 'next/image'
import Link from 'next/link'
import { signOut } from '@/auth'
import { istTime } from '@/lib/format'
import type { Entry } from '@/lib/searchIndex'
import mark from './assets/mesa-mark.png'
import { GlobalSearch } from './GlobalSearch'
import { NavLinks } from './NavLinks'
import { ProfileMenu } from './ProfileMenu'

async function signOutAction() {
  'use server'
  await signOut({ redirectTo: '/admin/login' })
}

export function Shell({
  user,
  index,
  children,
}: {
  user: { email: string; name: string | null }
  index: Entry[]
  children: React.ReactNode
}) {
  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link href="/" className="brand" aria-label="Forge C1 overview">
            <Image src={mark} alt="" width={28} height={28} className="brand-mark" priority />
            Forge C1
          </Link>
          <NavLinks />
          <GlobalSearch index={index} />
          <ProfileMenu name={user.name} email={user.email} signOutAction={signOutAction} />
        </div>
      </header>
      <main>{children}</main>
    </>
  )
}

/** When the figures on this page were read. Sits in each page's heading so it always matches them. */
export function Updated({ readAt }: { readAt: number }) {
  return <span className="updated">Updated {istTime(readAt)}</span>
}

export function ReadError({ message }: { message: string }) {
  return (
    <div className="error-card">
      <h2>Couldn’t read the sheets</h2>
      <p>
        Nothing is shown, so that no number here is wrong. The sheet said: <code>{message}</code>
      </p>
      <p>If a column or tab was renamed, rename it back or tell whoever maintains this dashboard.</p>
    </div>
  )
}
