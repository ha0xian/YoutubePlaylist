import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getPlaylist } from '../api/playlists'
import { useAuth } from '../auth/useAuth'
import type { PlaylistDetail as PlaylistDetailType } from '../types/playlist'
import VideoListItem from '../components/VideoListItem'
import UserMenu from '../components/UserMenu'

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()

  const [playlist, setPlaylist] = useState<PlaylistDetailType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!token || !id || fetchId.current === id) return
    fetchId.current = id

    let isMounted = true
    setIsLoading(true)
    setError(null)

    getPlaylist(token, id)
      .then((data) => {
        if (isMounted) setPlaylist(data)
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load playlist.',
          )
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token, id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-sm text-[#999]">Loading playlist…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-[#999] mb-4">{error}</p>
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
              onClick={() => navigate('/')}
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
          <UserMenu />
        </div>
        {playlist.description && (
          <p className="text-sm text-[#999] px-6 pb-4">{playlist.description}</p>
        )}
      </header>

      <main className="flex flex-col divide-y divide-[#333]">
        {playlist.videos.length === 0 ? (
          <p className="text-sm text-[#999] p-6 text-center">
            This playlist has no videos.
          </p>
        ) : (
          playlist.videos.map((video) => (
            <VideoListItem key={video.id} video={video} />
          ))
        )}
      </main>
    </div>
  )
}
