import { useAuth } from '../auth/useAuth'

export default function UserMenu() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-medium text-white">{user.username}</p>
        <p className="truncate text-xs text-[#999]">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-md border border-[#444] bg-[#1a1a1a] px-3 py-2 text-sm font-semibold text-[#e0e0e0] transition-colors hover:border-[#666] hover:bg-[#2a2a2a] cursor-pointer"
      >
        Logout
      </button>
    </div>
  )
}
