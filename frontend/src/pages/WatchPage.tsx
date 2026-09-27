import ResizableStudyWorkspace from '../components/ResizableStudyWorkspace'
import { useParams, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import YouTubePlayer from '../components/YouTubePlayer'
import type { YouTubePlayerHandle } from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const playerRef = useRef<YouTubePlayerHandle | null>(null)

  if (!videoId) return <Navigate to="/" replace />

  const isRemoved =
    (location.state as { isRemoved?: boolean } | null)?.isRemoved === true

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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-black ">
          {isRemoved && (
            <div className="border-b border-accent bg-accent-soft px-4 py-2 text-center text-xs text-danger">
              This video is unavailable or has been removed.
            </div>
          )}
          <YouTubePlayer key={videoId} ref={playerRef} initialVideoId={videoId} />
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
