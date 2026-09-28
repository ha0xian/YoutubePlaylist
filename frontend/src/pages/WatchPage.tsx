import ResizableStudyWorkspace from '../components/ResizableStudyWorkspace'
import { useParams, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import YouTubePlayer from '../components/YouTubePlayer'
import type { YouTubePlayerHandle } from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'
import VideoDetails from '../components/VideoDetails'
import { getVideo } from '../api/playlists'
import { useAuth } from '../auth/useAuth'
import type { Video } from '../types/playlist'

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()
  const playerRef = useRef<YouTubePlayerHandle | null>(null)
  const [video, setVideo] = useState<Video | null>(null)

  useEffect(() => {
    if (!videoId || !token) return
    let active = true
    getVideo(token, videoId)
      .then((data) => { if (active) setVideo(data) })
      .catch(() => { if (active) setVideo(null) })
    return () => { active = false }
  }, [token, videoId])

  if (!videoId) return <Navigate to="/" replace />

  const isRemoved =
    (location.state as { isRemoved?: boolean } | null)?.isRemoved === true
  const currentVideo = video?.youtubeVideoId === videoId ? video : null

  return (
    <div className="study-page bg-app flex flex-col text-main">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 ">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost rounded-lg px-3 py-2 text-sm">
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-main">Focus Watch</h1>
            <p className="truncate text-xs text-muted">Video notes workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-lg px-3 py-2 text-xs">
            Resources
          </button>
          <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-lg px-3 py-2 text-xs">
            Share
          </button>
          <UserMenu />
        </div>
      </header>

      <ResizableStudyWorkspace storageKey="yt-study:watch-pane-ratio" video={(
        <section className="video-panel flex min-h-0 flex-col overflow-hidden rounded-lg border border-line">
          {isRemoved && (
            <div className="border-b border-accent bg-accent-soft px-4 py-2 text-center text-xs text-danger">
              This video is unavailable or has been removed.
            </div>
          )}
          <div className="bg-black">
            <YouTubePlayer key={videoId} ref={playerRef} initialVideoId={videoId} />
          </div>
          {currentVideo ? (
            <VideoDetails
              key={currentVideo.youtubeVideoId}
              video={currentVideo}
              onSeekToTime={(seconds) => playerRef.current?.seekTo(seconds)}
            />
          ) : null}
        </section>
        )} notes={(
        <section className="surface min-h-0 overflow-hidden rounded-lg">
          <MarkdownNotes
            key={videoId}
            videoId={videoId}
            getCurrentTime={() => playerRef.current?.getCurrentTime() ?? null}
            onSeekToTime={(seconds) => playerRef.current?.seekTo(seconds)}
          />
        </section>
      )} />
    </div>
  )
}
