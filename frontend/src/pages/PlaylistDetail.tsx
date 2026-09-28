import ResizableStudyWorkspace from '../components/ResizableStudyWorkspace'
import { useParams, useNavigate } from 'react-router-dom'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { getPlaylist, refreshPlaylist, unlinkPlaylist } from '../api/playlists'
import { useAuth } from '../auth/useAuth'
import type { PlaylistDetail as PlaylistDetailType } from '../types/playlist'
import VideoListItem from '../components/VideoListItem'
import YouTubePlayer from '../components/YouTubePlayer'
import type { YouTubePlayerHandle } from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'
import VideoDetails from '../components/VideoDetails'
import { filterAndSortVideos, type QueueDirection, type QueueSort } from '../lib/videoQueue'

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
  const [queueQuery, setQueueQuery] = useState('')
  const [queueSort, setQueueSort] = useState<QueueSort>('playlist')
  const [queueDirection, setQueueDirection] = useState<QueueDirection>('asc')
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
  const deferredQueueQuery = useDeferredValue(queueQuery)
  const visibleVideos = useMemo(
    () => filterAndSortVideos(playlist?.videos ?? [], deferredQueueQuery, queueSort, queueDirection),
    [playlist?.videos, deferredQueueQuery, queueSort, queueDirection],
  )

  if (isLoading) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <div className="surface rounded-lg px-5 py-4 text-sm text-muted">Loading playlist...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-md rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-main">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary mt-5 rounded-lg px-4 py-2 text-sm font-semibold">
            Back to library
          </button>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center p-6">
        <div className="surface max-w-md rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-main">Playlist not found</h2>
          <button onClick={() => navigate('/')} className="btn-secondary mt-5 rounded-lg px-4 py-2 text-sm font-semibold">
            Back to library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="study-page bg-app flex flex-col text-main">
      <header className="shrink-0 border-b border-line bg-panel px-4 py-3  sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <button onClick={() => navigate('/')} className="btn-ghost rounded-lg px-2 py-1">
                Back
              </button>
              <span>/</span>
              <span>Playlists</span>
              <span>/</span>
              <span className="truncate text-main">{playlist.title}</span>
            </div>
            <h1 className="truncate text-lg font-semibold text-main">{playlist.title}</h1>
            <p className="mt-1 truncate text-xs text-muted">
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
                className="control w-full rounded-lg px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
            {playlist.source !== 'personal' && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn-secondary rounded-lg px-3 py-2 text-sm font-semibold"
                title="Refresh playlist from YouTube"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
            <button
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-accent-soft disabled:opacity-50"
              title="Unlink playlist"
            >
              {isUnlinking ? 'Unlinking...' : 'Unlink'}
            </button>
            <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-lg px-3 py-2 text-sm">
              More
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {playlist.videos.length === 0 ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="surface-subtle rounded-lg p-8 text-sm text-muted">This playlist has no videos.</div>
        </main>
      ) : (
        <ResizableStudyWorkspace
          storageKey="yt-study:playlist-pane-ratio"
          video={(
            <section className="video-panel flex min-h-0 flex-col overflow-hidden rounded-lg border border-line">
            {effectiveVideo?.isRemoved && (
              <div className="border-b border-accent bg-accent-soft px-4 py-2 text-center text-xs text-danger">
                This video is unavailable or has been removed.
              </div>
            )}
            <div className="min-w-0 bg-black">
              <YouTubePlayer
                key={effectiveVideoId ?? 'no-video'}
                ref={playerRef}
                initialVideoId={effectiveVideoId ?? undefined}
              />
            </div>
            {effectiveVideo ? (
              <VideoDetails
                key={effectiveVideo.youtubeVideoId}
                video={effectiveVideo}
                onSeekToTime={(seconds) => playerRef.current?.seekTo(seconds)}
              />
            ) : null}
          </section>
          )}
          queue={(
            <section className="surface flex min-h-0 flex-col overflow-hidden rounded-lg">
              <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-main">Queue</h2>
                  <p className="text-xs text-muted">
                    {visibleVideos.length === playlist.videos.length
                      ? `${playlist.videos.length} videos`
                      : `${visibleVideos.length} of ${playlist.videos.length} videos`}
                  </p>
                </div>
                <button type="button" disabled title="To be implemented later" className="btn-ghost rounded-lg px-2 py-1 text-xs">
                  Remove watched
                </button>
              </div>
              <div className="queue-controls border-b border-line p-3">
                <label>
                  <span className="sr-only">Search queue</span>
                  <input
                    type="search"
                    value={queueQuery}
                    onChange={(event) => setQueueQuery(event.target.value)}
                    placeholder="Search title or channel..."
                    className="control w-full rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label>
                  <span className="sr-only">Sort queue</span>
                  <select
                    value={queueSort}
                    onChange={(event) => setQueueSort(event.target.value as QueueSort)}
                    className="control w-full rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="playlist">Playlist order</option>
                    <option value="recentlyAdded">Recently added</option>
                    <option value="title">Title</option>
                    <option value="views">View count</option>
                    <option value="published">Published date</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-secondary queue-direction rounded-lg px-3 py-2 text-sm"
                  aria-label={`Sort direction: ${queueDirection === 'asc' ? 'ascending' : 'descending'}. Change to ${queueDirection === 'asc' ? 'descending' : 'ascending'}.`}
                  onClick={() => setQueueDirection((direction) => direction === 'asc' ? 'desc' : 'asc')}
                >
                  {queueDirection === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {visibleVideos.map((video) => (
                  <VideoListItem
                    key={video.id}
                    video={video}
                    variant="queue"
                    isSelected={video.youtubeVideoId === effectiveVideoId}
                    onSelect={(v) => setSelectedVideoId(v.youtubeVideoId)}
                  />
                ))}
                {visibleVideos.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted">No videos match your search.</p>
                ) : null}
              </div>
            </section>
          )}
          notes={(
            <section className="surface min-h-0 overflow-hidden rounded-lg">
              <MarkdownNotes
                key={effectiveVideoId ?? 'no-video'}
                videoId={effectiveVideoId ?? undefined}
                getCurrentTime={() => playerRef.current?.getCurrentTime() ?? null}
                onSeekToTime={(seconds) => playerRef.current?.seekTo(seconds)}
              />
            </section>
          )}
        />
      )}
    </div>
  )
}
