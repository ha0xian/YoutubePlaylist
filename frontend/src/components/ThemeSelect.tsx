import { useTheme } from '../theme/ThemeContext'
import { parseThemePreference } from '../lib/theme'

export default function ThemeSelect() {
  const { preference, setPreference } = useTheme()
  return (
    <label className="theme-select">
      <span className="sr-only">Color theme</span>
      <select className="control rounded-md px-2 py-2 text-xs" value={preference}
        onChange={(event) => setPreference(parseThemePreference(event.target.value))}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  )
}
