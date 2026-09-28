/**
 * Who may see the dashboard: an email whose domain is exactly `mesaschool.co`.
 *
 * Exact, not "ends with". Students are `@forge27.mesaschool.co`, and they are
 * almost certainly in the same Google Workspace organisation, so Google's own
 * Internal setting lets them through and so would Google's `hd` claim. This
 * function is the line between staff and the people the mentor notes are about.
 */
export const STAFF_DOMAIN = 'mesaschool.co'

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const at = email.lastIndexOf('@')
  if (at <= 0) return false
  return email.slice(at + 1).trim().toLowerCase() === STAFF_DOMAIN
}
