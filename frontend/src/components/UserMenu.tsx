import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { getYouTubeStatus, disconnectYouTube } from '../api/playlist'
import ThemeToggle from './ThemeToggle'

export default function UserMenu() {
  const { user, token, logout } = useAuth()
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    getYouTubeStatus(token)
      .then(({ connected }) => {
        if (!cancelled) setYoutubeConnected(connected)
      })
      .catch(() => {
        if (!cancelled) setYoutubeConnected(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleDisconnect = useCallback(async () => {
    if (!token) return
    setDisconnecting(true)
    try {
      await disconnectYouTube(token)
      setYoutubeConnected(false)
      setShowConfirm(false)
    } catch {
      // Silently handle error
    } finally {
      setDisconnecting(false)
    }
  }, [token])

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />

      {youtubeConnected && (
        <div className="relative">
          {showConfirm ? (
            <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-xl z-20 min-w-[200px]">
              <p className="text-sm text-[#e0e0e0] mb-2">
                Disconnect YouTube account? OAuth playlists will be unlinked.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md border border-[#444] bg-[#2a2a2a] px-3 py-1.5 text-xs font-semibold text-[#e0e0e0] transition-colors hover:border-[#666] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-md border border-[#cc0000] bg-[#cc0000] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#aa0000] disabled:opacity-50 cursor-pointer"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="rounded-md border border-[#444] bg-[#1a1a1a] px-3 py-2 text-sm font-semibold text-[#ff6b6b] transition-colors hover:border-[#cc0000] hover:bg-[#2a1a1a] cursor-pointer"
            >
              Disconnect YouTube
            </button>
          )}
        </div>
      )}

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
