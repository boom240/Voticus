import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import * as authApi from '../api/auth'
import { ApiError, getToken, setToken } from '../api/client'
import type { CurrentUser } from '../types/auth'

export interface AuthUser extends CurrentUser {
  isApproved: boolean
  isAdmin: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  // True until the stored token has been checked against the API.
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function toAuthUser(me: CurrentUser): AuthUser {
  return {
    ...me,
    isApproved: me.roles.includes('Approved'),
    isAdmin: me.roles.includes('Admin'),
  }
}

// Fetches the current user for the stored token. Null when there is no valid session.
async function fetchUser(): Promise<AuthUser | null> {
  if (!getToken()) return null
  try {
    return toAuthUser(await authApi.getMe())
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      setToken(null)
      return null
    }
    throw err
  }
}

export function AuthProvider({ children, initialUser }: PropsWithChildren<{ initialUser?: AuthUser | null }>) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null)
  const [loading, setLoading] = useState(initialUser === undefined && getToken() != null)

  // Roles come from the server on every load so approval shows without a new login.
  useEffect(() => {
    if (initialUser !== undefined) return
    let cancelled = false
    fetchUser()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        // Network trouble. Keep whatever state we had.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [initialUser])

  const refresh = useCallback(async () => {
    setUser(await fetchUser())
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const { token } = await authApi.login(email, password)
      setToken(token)
      await refresh()
    },
    [refresh],
  )

  const register = useCallback(async (email: string, password: string) => {
    await authApi.register(email, password)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
