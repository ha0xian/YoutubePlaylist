import { useParams, Navigate } from 'react-router-dom'
import YouTubePlayer from '../components/YouTubePlayer'
import MarkdownNotes from '../components/MarkdownNotes'
import UserMenu from '../components/UserMenu'

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>()

  if (!videoId) return <Navigate to="/" replace />

  // Read metadata from localStorage (set by VideoListItem)
  const videoDbIdStr = localStorage.getItem('video-db-id')
  const videoDbId = videoDbIdStr ? Number(videoDbIdStr) : 0
  const isRemoved = localStorage.getItem('video-is-removed') === 'true'
  const videoTitle = localStorage.getItem('video-title') || ''

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="shrink-0 grow-0 basis-[70%] flex flex-col bg-black">
        {isRemoved && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 bg-[#cc0000]/90 text-white text-sm font-medium"
            role="alert"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L4.208 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span>
              This video has been removed from the source YouTube playlist.
              {videoTitle && (
                <span className="ml-1 text-[#ffcccc]">
                  &quot;{videoTitle}&quot;
                </span>
              )}
            </span>
          </div>
        )}
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
