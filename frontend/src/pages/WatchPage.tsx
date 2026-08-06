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
    <div className="bg-app flex h-screen flex-col overflow-hidden text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e12]/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost rounded-md px-3 py-2 text-sm">
            Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">Focus Watch</h1>
            <p className="truncate text-xs text-slate-500">Video notes workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-md px-3 py-2 text-xs">
            Resources
          </button>
          <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-md px-3 py-2 text-xs">
            Share
          </button>
          <UserMenu />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-black shadow-2xl">
          {isRemoved && (
            <div className="border-b border-amber-400/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
              This video is unavailable or has been removed.
            </div>
          )}
          <YouTubePlayer key={videoId} ref={playerRef} initialVideoId={videoId} />
        </section>
        <section className="surface min-h-0 overflow-hidden rounded-md">
          <MarkdownNotes
            key={videoId}
            videoId={videoId}
            getCurrentTime={() => playerRef.current?.getCurrentTime() ?? null}
            onSeekToTime={(seconds) => playerRef.current?.seekTo(seconds)}
          />
        </section>
      </main>
    </div>
  )
}
