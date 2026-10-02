import { createContext, useContext, useState, type ReactNode } from 'react'

// Accounts live in localStorage until the site has a real backend.
// Passwords are stored only as SHA-256 hashes. Errors carry a code (AuthErrorCode)
// as their message so the login page can show it in the current language.
const USERS_KEY = 'rentmotors.users'
const SESSION_KEY = 'rentmotors.session'

export type User = { name: string; email: string }
type StoredUser = User & { passwordHash: string }
export type AuthErrorCode = 'invalid-credentials' | 'email-taken'

type AuthContextValue = {
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable (private mode): the session just won't persist.
  }
}

async function hash(password: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => read<User | null>(SESSION_KEY, null))

  function startSession(next: User) {
    setUser(next)
    write(SESSION_KEY, next)
  }

  async function signIn(email: string, password: string) {
    const users = read<StoredUser[]>(USERS_KEY, [])
    const found = users.find(u => u.email === email.trim().toLowerCase())
    if (!found || found.passwordHash !== (await hash(password))) {
      throw new Error('invalid-credentials' satisfies AuthErrorCode)
    }
    startSession({ name: found.name, email: found.email })
  }

  async function signUp(name: string, email: string, password: string) {
    const users = read<StoredUser[]>(USERS_KEY, [])
    const normalized = email.trim().toLowerCase()
    if (users.some(u => u.email === normalized)) {
      throw new Error('email-taken' satisfies AuthErrorCode)
    }
    const created = { name: name.trim(), email: normalized }
    write(USERS_KEY, [...users, { ...created, passwordHash: await hash(password) }])
    startSession(created)
  }

  function signOut() {
    setUser(null)
    write(SESSION_KEY, null)
  }

  return <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
