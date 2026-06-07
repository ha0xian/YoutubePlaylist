import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getPlaylist } from '../api/playlists'
import { useAuth } from '../auth/useAuth'
import type { PlaylistDetail as PlaylistDetailType } from '../types/playlist'
import VideoListItem from '../components/VideoListItem'
import YouTubePlayer from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()

  const canFetch = Boolean(id && token)
  const [playlist, setPlaylist] = useState<PlaylistDetailType | null>(null)
  const [isLoading, setIsLoading] = useState(canFetch)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const fetchVersionRef = useRef(0)

  useEffect(() => {
    if (!id || !token) return

    const version = ++fetchVersionRef.current

    getPlaylist(token, id)
      .then((data) => {
        if (version === fetchVersionRef.current) {
          setPlaylist(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (version === fetchVersionRef.current) {
          setError(
            err instanceof Error ? err.message : 'Failed to load playlist.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      fetchVersionRef.current = -1
    }
  }, [token, id])

  // Auto-select first video when playlist loads, fall back if selected is no longer in list
  const effectiveVideoId = (() => {
    if (!playlist || playlist.videos.length === 0) return null
    if (
      selectedVideoId &&
      playlist.videos.some((v) => v.youtubeVideoId === selectedVideoId)
    ) {
      return selectedVideoId
    }
    return playlist.videos[0].youtubeVideoId
  })()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-sm text-[#999]">Loading playlist...</p>
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
    <div className="h-screen bg-[#0f0f0f] flex flex-col overflow-hidden">
      <header className="shrink-0 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-[#333]">
        <div className="flex items-center justify-between gap-4 px-6 py-3">
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
              <h1 className="text-lg font-bold text-white truncate">{playlist.title}</h1>
              <p className="text-xs text-[#999] mt-0.5">
                {playlist.channelTitle} &middot; {playlist.videoCount} videos
              </p>
            </div>
          </div>
          <UserMenu />
        </div>
        {playlist.description && (
          <p className="text-sm text-[#999] px-6 pb-3 truncate">{playlist.description}</p>
        )}
      </header>

      {playlist.videos.length === 0 ? (
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#999]">This playlist has no videos.</p>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden">
          {/* Left: YouTube player */}
          <div className="flex-[7] flex flex-col bg-black min-w-0">
            <YouTubePlayer
              key={effectiveVideoId ?? 'no-video'}
              initialVideoId={effectiveVideoId ?? undefined}
            />
          </div>
          {/* Right: notes + video list */}
          <div className="flex-[3] flex flex-col border-l border-[#333] min-w-[360px]">
            <div className="h-[45%] overflow-hidden">
              <MarkdownNotes
                key={effectiveVideoId ?? 'no-video'}
                videoId={effectiveVideoId ?? undefined}
              />
            </div>
            <div className="flex-1 overflow-y-auto border-t border-[#333]">
              {playlist.videos.map((video) => (
                <VideoListItem
                  key={video.id}
                  video={video}
                  isSelected={video.youtubeVideoId === effectiveVideoId}
                  onSelect={(v) => setSelectedVideoId(v.youtubeVideoId)}
                />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
