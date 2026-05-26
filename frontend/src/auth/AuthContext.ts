import { createContext } from 'react'
import type { AuthCredentials, AuthUser, RegisterCredentials } from '../api/auth'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: AuthCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
}

export const TOKEN_STORAGE_KEY = 'youtube-playlist-auth-token'

export const AuthContext = createContext<AuthContextValue | null>(null)
