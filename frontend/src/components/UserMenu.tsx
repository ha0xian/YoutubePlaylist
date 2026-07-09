import { useAuth } from '../auth/useAuth'

export default function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-sm font-medium text-white">{user.username}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-slate-200">
        {user.username.slice(0, 2).toUpperCase()}
      </div>
      <button
        type="button"
        onClick={logout}
        className="btn-secondary rounded-md px-3 py-2 text-sm font-semibold"
      >
        Logout
      </button>
    </div>
  )
}
