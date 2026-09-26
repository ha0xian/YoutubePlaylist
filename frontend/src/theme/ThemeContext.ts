import { createContext, useContext } from 'react'
import type { ThemePreference, ResolvedTheme } from '../lib/theme'

export interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}
export const ThemeContext = createContext<ThemeContextValue | null>(null)
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme requires ThemeProvider')
  return context
}
