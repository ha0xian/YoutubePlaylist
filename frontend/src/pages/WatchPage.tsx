import { useParams, Navigate } from 'react-router-dom'
import YouTubePlayer from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()

  if (!videoId) return <Navigate to="/" replace />

  // Read the DB video ID from localStorage (set by VideoListItem)
  const videoDbIdStr = localStorage.getItem('video-db-id')
  const videoDbId = videoDbIdStr ? Number(videoDbIdStr) : 0

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="shrink-0 grow-0 basis-[70%] flex flex-col bg-black">
        <YouTubePlayer key={videoId} initialVideoId={videoId} />
      </div>
      <div className="shrink-0 grow-0 basis-[30%] flex flex-col border-l border-[#333] min-w-[320px]">
        <div className="shrink-0 border-b border-[#333] bg-[#0f0f0f] px-4 py-3">
          <UserMenu />
        </div>
        {videoDbId > 0 ? (
          <MarkdownNotes key={videoDbId} videoId={videoDbId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[#666]">
            Select a video from a playlist to take notes
          </div>
        )}
      </div>
    </div>
  )
}
