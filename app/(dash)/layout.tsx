import { Shell } from '@/components/Shell'
import { buildIndex } from '@/lib/searchIndex'
import { requireStaff } from '@/lib/session'
import { getDashboard } from '@/lib/sheets'

/**
 * The frame every signed-in page shares, so the top bar does not redraw between
 * pages. Each page still checks the session itself before reading data
 * (`staffDashboard`): a layout is not re-run on every navigation, so it is not
 * where the lock lives.
 *
 * The search index is built here, once per full load. It holds only names and
 * links, so it being a little older than the page below it does no harm.
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff()
  const index = await getDashboard()
    .then(buildIndex)
    .catch(() => [])
  return (
    <Shell user={user} index={index}>
      {children}
    </Shell>
  )
}
