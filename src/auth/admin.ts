import type { User } from './AuthContext'

// Only hides admin links and pages; the server checks the role on every admin request.
export function isAdmin(user: User | null) {
  return user?.role === 'ADMIN'
}
