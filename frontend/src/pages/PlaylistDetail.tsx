import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getPlaylist, refreshPlaylist, unlinkPlaylist } from '../api/playlists'
import { useAuth } from '../auth/useAuth'
import type { PlaylistDetail as PlaylistDetailType } from '../types/playlist'
import VideoListItem from '../components/VideoListItem'
import YouTubePlayer from '../components/YouTubePlayer'
import type { YouTubePlayerHandle } from '../components/YouTubePlayer'
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const fetchVersionRef = useRef(0)
  const playerRef = useRef<YouTubePlayerHandle | null>(null)

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
          setError(err instanceof Error ? err.message : 'Failed to load playlist.')
          setIsLoading(false)
        }
      })

    return () => {
      fetchVersionRef.current = -1
    }
  }, [token, id])

  const handleRefresh = () => {
    if (!id || !token || isRefreshing) return

    setIsRefreshing(true)
    refreshPlaylist(token, id)
      .then((data) => {
        setPlaylist(data)
        setIsRefreshing(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to refresh playlist.')
        setIsRefreshing(false)
      })
  }

  const handleUnlink = () => {
    if (!id || !token || isUnlinking) return

    setIsUnlinking(true)
    unlinkPlaylist(token, id)
      .then(() => {
        navigate('/')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to unlink playlist.')
        setIsUnlinking(false)
      })
  }

  const effectiveVideoId = (() => {
    if (!playlist || playlist.videos.length === 0) return null
    if (selectedVideoId && playlist.videos.some((v) => v.youtubeVideoId === selectedVideoId)) {
      return selectedVideoId
    }
    return playlist.videos[0].youtubeVideoId
  })()

  const effectiveVideo =
    playlist?.videos.find((v) => v.youtubeVideoId === effectiveVideoId) ?? null

  if (isLoading) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <div className="surface rounded-md px-5 py-4 text-sm text-slate-400">Loading playlist...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-md rounded-md p-6 text-center">
          <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary mt-5 rounded-md px-4 py-2 text-sm font-semibold">
            Back to library
          </button>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-md rounded-md p-6 text-center">
          <h2 className="text-xl font-semibold text-white">Playlist not found</h2>
          <button onClick={() => navigate('/')} className="btn-secondary mt-5 rounded-md px-4 py-2 text-sm font-semibold">
            Back to library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-app flex h-screen flex-col overflow-hidden text-slate-100">
      <header className="shrink-0 border-b border-white/10 bg-[#0b0e12]/90 px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <button onClick={() => navigate('/')} className="btn-ghost rounded-md px-2 py-1">
                Back
              </button>
              <span>/</span>
              <span>Playlists</span>
              <span>/</span>
              <span className="truncate text-slate-300">{playlist.title}</span>
            </div>
            <h1 className="truncate text-lg font-semibold text-white">{playlist.title}</h1>
            <p className="mt-1 truncate text-xs text-slate-500">
              {playlist.channelTitle} - {playlist.videoCount} videos
              {playlist.description ? ` - ${playlist.description}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1 xl:w-80 xl:flex-none">
              <input
                disabled
                title="To be implemented later"
                placeholder="Search in this playlist..."
                className="control w-full rounded-md px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
            {playlist.source !== 'personal' && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn-secondary rounded-md px-3 py-2 text-sm font-semibold"
                title="Refresh playlist from YouTube"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
            <button
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-50"
              title="Unlink playlist"
            >
              {isUnlinking ? 'Unlinking...' : 'Unlink'}
            </button>
            <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-md px-3 py-2 text-sm">
              More
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {playlist.videos.length === 0 ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="surface-subtle rounded-md p-8 text-sm text-slate-400">This playlist has no videos.</div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-black shadow-2xl">
            {effectiveVideo?.isRemoved && (
              <div className="border-b border-amber-400/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
                This video is unavailable or has been removed.
              </div>
            )}
            <div className="min-h-[320px] flex-1">
              <YouTubePlayer
                key={effectiveVideoId ?? 'no-video'}
                ref={playerRef}
                initialVideoId={effectiveVideoId ?? undefined}
              />
            </div>
          </section>

          <aside className="grid min-h-0 grid-rows-[minmax(220px,0.95fr)_minmax(260px,1.05fr)] gap-4">
            <section className="surface flex min-h-0 flex-col overflow-hidden rounded-md">
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Queue</h2>
                  <p className="text-xs text-slate-500">{playlist.videos.length} videos</p>
                </div>
                <button type="button" disabled title="To be implemented later" className="btn-ghost rounded-md px-2 py-1 text-xs">
                  Remove watched
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {playlist.videos.map((video) => (
                  <VideoListItem
                    key={video.id}
                    video={video}
                    isSelected={video.youtubeVideoId === effectiveVideoId}
                    onSelect={(v) => setSelectedVideoId(v.youtubeVideoId)}
                  />
                ))}
              </div>
            </section>

            <section className="surface min-h-0 overflow-hidden rounded-md">
              <MarkdownNotes
                key={effectiveVideoId ?? 'no-video'}
                videoId={effectiveVideoId ?? undefined}
                getCurrentTime={() => playerRef.current?.getCurrentTime() ?? null}
                onSeekToTime={(seconds) => playerRef.current?.seekTo(seconds)}
              />
            </section>
          </aside>
        </main>
      )}
    </div>
  )
}
