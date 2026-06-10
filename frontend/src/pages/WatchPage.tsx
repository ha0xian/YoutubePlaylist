import { useParams, useLocation, Navigate } from 'react-router-dom'
import YouTubePlayer from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const location = useLocation()

  if (!videoId) return <Navigate to="/" replace />

  const isRemoved =
    (location.state as { isRemoved?: boolean } | null)?.isRemoved === true

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="shrink-0 grow-0 basis-[70%] flex flex-col bg-black">
        {isRemoved && (
          <div className="bg-[#cc0000]/10 border-b border-[#cc0000]/30 px-4 py-2 text-center">
            <p className="text-xs text-[#cc0000]">
              This video was removed from the source playlist.
            </p>
          </div>
        )}
        <YouTubePlayer key={videoId} initialVideoId={videoId} />
      </div>
      <div className="shrink-0 grow-0 basis-[30%] flex flex-col border-l border-[#333] min-w-[320px]">
        <div className="shrink-0 border-b border-[#333] bg-[#0f0f0f] px-4 py-3">
          <UserMenu />
        </div>
        <MarkdownNotes key={videoId} videoId={videoId} />
      </div>
    </div>
  )
}
