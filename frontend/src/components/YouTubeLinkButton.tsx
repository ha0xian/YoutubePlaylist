import { useState, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { getYouTubeAuthUrl } from '../api/playlist'

export default function YouTubeLinkButton() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)

    try {
      const { auth_url } = await getYouTubeAuthUrl(token)
      // Full-page redirect per security finding #1 (more secure than popup)
      window.location.href = auth_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect YouTube')
      setIsLoading(false)
    }
  }, [token])

  if (!token) return null

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-md border border-[#444] bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-[#e0e0e0] transition-colors hover:border-[#666] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-[#666] border-t-white rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        )}
        Sign in with YouTube
      </button>
      {error && (
        <p className="mt-1.5 text-xs text-[#ff6b6b]">{error}</p>
      )}
    </div>
  )
}
