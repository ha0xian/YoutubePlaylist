import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getHiddenPlaylists, showPlaylist } from '../api/playlist'
import type { Playlist } from '../types/playlist'

export default function HiddenPlaylists() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    const t: string = token

    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getHiddenPlaylists(t)
        if (!cancelled) setPlaylists(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hidden playlists')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [token])

  const handleRestore = useCallback(
    async (id: number) => {
      if (!token) return
      setRestoringId(id)
      try {
        await showPlaylist(token, id)
        setPlaylists((prev) => prev.filter((pl) => pl.id !== id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore playlist')
      } finally {
        setRestoringId(null)
      }
    },
    [token],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-sm text-[#999]">
        Loading hidden playlists...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur-sm p-6 border-b border-[#333]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-[#999] hover:text-white transition-colors cursor-pointer bg-transparent border-none shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-white">Hidden Playlists</h1>
        </div>
      </header>

      <main className="p-6">
        {error && (
          <div className="mb-4 rounded-md bg-[#2a1a1a] border border-[#441111] p-3">
            <p className="text-sm text-[#ff6b6b]">{error}</p>
          </div>
        )}

        {playlists.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#999] text-sm mb-2">No hidden playlists</p>
            <p className="text-[#666] text-xs">
              Hiding a playlist from the playlist detail page will move it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="bg-[#1a1a1a] rounded-lg overflow-hidden ring-1 ring-[#333]"
              >
                <img
                  src={pl.thumbnailUrl}
                  alt={pl.title}
                  className="w-full aspect-video object-cover opacity-60"
                  loading="lazy"
                />
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                    {pl.title}
                  </h3>
                  <p className="text-xs text-[#999]">{pl.channelTitle}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRestore(pl.id)}
                      disabled={restoringId === pl.id}
                      className="flex-1 rounded-md border border-[#444] bg-[#2a2a2a] px-3 py-1.5 text-xs font-semibold text-[#e0e0e0] transition-colors hover:border-[#6cb6ff] hover:text-[#6cb6ff] disabled:opacity-50 cursor-pointer"
                    >
                      {restoringId === pl.id ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
