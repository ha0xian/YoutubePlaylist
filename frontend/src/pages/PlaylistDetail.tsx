import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { getPlaylistById, hidePlaylist, unlinkPlaylist } from '../api/playlist'
import VideoListItem from '../components/VideoListItem'
import UserMenu from '../components/UserMenu'
import type { Playlist } from '../types/playlist'

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !id) return
    const t: string = token

    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getPlaylistById(t, Number(id))
        if (!cancelled) setPlaylist(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load playlist')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [token, id])

  const handleHide = useCallback(async () => {
    if (!token || !playlist) return
    const t: string = token
    setActionInProgress('hide')
    try {
      await hidePlaylist(t, playlist.id)
      navigate('/', { replace: true })
    } catch {
      setError('Failed to hide playlist')
    } finally {
      setActionInProgress(null)
    }
  }, [token, playlist, navigate])

  const handleUnlink = useCallback(async () => {
    if (!token || !playlist) return
    const t: string = token
    setActionInProgress('unlink')
    try {
      await unlinkPlaylist(t, playlist.id)
      navigate('/', { replace: true })
    } catch {
      setError('Failed to unlink playlist')
    } finally {
      setActionInProgress(null)
    }
  }, [token, playlist, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-sm text-[#999]">
        Loading playlist...
      </div>
    )
  }

  if (error && !playlist) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Playlist not found</h2>
          <p className="text-sm text-[#ff6b6b] mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[#6cb6ff] hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            Back to all playlists
          </button>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Playlist not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-[#6cb6ff] hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          >
            Back to all playlists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-[#333]">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-[#999] hover:text-white transition-colors cursor-pointer bg-transparent border-none shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{playlist.title}</h1>
              <p className="text-xs text-[#999] mt-0.5">
                {playlist.channelTitle} &middot; {playlist.videoCount} videos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-[#ff6b6b]">{error}</span>
            )}
            <button
              type="button"
              onClick={handleHide}
              disabled={actionInProgress === 'hide'}
              className="rounded-md border border-[#444] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-[#e0e0e0] transition-colors hover:border-[#666] disabled:opacity-50 cursor-pointer"
            >
              {actionInProgress === 'hide' ? 'Hiding...' : 'Hide playlist'}
            </button>
            <button
              type="button"
              onClick={handleUnlink}
              disabled={actionInProgress === 'unlink'}
              className="rounded-md border border-[#441111] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-[#ff6b6b] transition-colors hover:border-[#cc0000] disabled:opacity-50 cursor-pointer"
            >
              {actionInProgress === 'unlink' ? 'Unlinking...' : 'Unlink playlist'}
            </button>
            <UserMenu />
          </div>
        </div>
        {playlist.description && (
          <p className="text-sm text-[#999] px-6 pb-4">{playlist.description}</p>
        )}
      </header>

      <main className="flex flex-col divide-y divide-[#333]">
        {playlist.videos && playlist.videos.length > 0 ? (
          playlist.videos.map((video) => (
            <VideoListItem key={video.id} video={video} />
          ))
        ) : (
          <div className="p-6 text-center text-sm text-[#666]">
            No videos in this playlist.
          </div>
        )}
      </main>
    </div>
  )
}
