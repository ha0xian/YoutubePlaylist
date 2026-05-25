import { useParams, Navigate } from 'react-router-dom'
import YouTubePlayer from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()

  if (!videoId) return <Navigate to="/" replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="shrink-0 grow-0 basis-[70%] flex flex-col bg-black">
        <YouTubePlayer key={videoId} initialVideoId={videoId} />
      </div>
      <div className="shrink-0 grow-0 basis-[30%] flex flex-col border-l border-[#333] min-w-[320px]">
        <MarkdownNotes />
      </div>
    </div>
  )
}
