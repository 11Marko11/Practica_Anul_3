import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'

// The signed-in user comes from the server, which keeps the session in an httpOnly cookie.
// Failed calls throw an ApiError whose `code` the login page translates.
export type User = { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' }

type AuthContextValue = {
  user: User | null
  loading: boolean // true until the first /auth/me answer, so pages don't flash the signed-out state
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Accounts used to live in localStorage; remove what earlier versions of the site left there.
function forgetLocalAccounts() {
  try {
    localStorage.removeItem('rentmotors.users')
    localStorage.removeItem('rentmotors.session')
  } catch {
    // Storage unavailable: nothing to clean up.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    forgetLocalAccounts()
    api<{ user: User | null }>('/auth/me')
      .then(res => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function signIn(email: string, password: string) {
    const res = await api<{ user: User }>('/auth/login', { body: { email, password } })
    setUser(res.user)
  }

  async function signUp(name: string, email: string, password: string) {
    const res = await api<{ user: User }>('/auth/register', { body: { name, email, password } })
    setUser(res.user)
  }

  async function signOut() {
    setUser(null)
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
