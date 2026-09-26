import ThemeSelect from './ThemeSelect'
import { USE_MOCK_DATA } from '../api/environment'
import { useAuth } from '../auth/useAuth'

export default function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="user-menu flex flex-wrap items-center gap-2">
      <ThemeSelect />
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-sm font-medium text-main">{user.username}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-muted text-xs font-semibold text-main">
        {user.username.slice(0, 2).toUpperCase()}
      </div>
      {USE_MOCK_DATA ? <span className="text-xs text-muted">Mock mode</span> : <button
        type="button"
        onClick={logout}
        className="btn-secondary rounded-lg px-3 py-2 text-sm font-semibold"
      >
        Logout
      </button>}
    </div>
  )
}
