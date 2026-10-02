import type { User } from './AuthContext'

// Accounts that can open the admin pages. Without a backend this check runs in the
// browser, so it only hides the pages; a server must enforce it once data is shared.
const ADMIN_EMAILS = ['marcel.mindru323@gmail.com']

export function isAdmin(user: User | null) {
  return !!user && ADMIN_EMAILS.includes(user.email)
}
