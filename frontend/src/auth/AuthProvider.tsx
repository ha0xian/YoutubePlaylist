import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
  type AuthCredentials,
  type AuthUser,
  type RegisterCredentials,
} from '../api/auth'
import { AuthContext, TOKEN_STORAGE_KEY, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const persistSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser(token)
        if (isMounted) {
          setUser(currentUser)
        }
      } catch {
        if (isMounted) {
          clearSession()
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isMounted = false
    }
  }, [clearSession, token])

  const login = useCallback(
    async (credentials: AuthCredentials) => {
      const response = await loginRequest(credentials)
      persistSession(response.token, response.user)
    },
    [persistSession],
  )

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      const response = await registerRequest(credentials)
      persistSession(response.token, response.user)
    },
    [persistSession],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout: clearSession,
    }),
    [clearSession, isLoading, login, register, token, user],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
