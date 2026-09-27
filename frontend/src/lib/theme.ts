export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
const THEME_KEY = 'yt-study:theme'

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
}
export function readThemePreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  try { return parseThemePreference(storage?.getItem(THEME_KEY) ?? null) } catch { return 'system' }
}
export function writeThemePreference(storage: Pick<Storage, 'setItem'> | null, preference: ThemePreference): void {
  try { storage?.setItem(THEME_KEY, preference) } catch { /* Device preferences are optional. */ }
}
export function initializeTheme(): void {
  let preference: ThemePreference = 'system'
  try { preference = readThemePreference(window.localStorage) } catch { /* Storage access can be denied. */ }
  const theme = resolveTheme(preference, window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
