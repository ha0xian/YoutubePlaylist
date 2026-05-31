import { useNavigate } from 'react-router-dom'
import type { Video } from '../types/playlist'

interface VideoListItemProps {
  video: Video
}

export default function VideoListItem({ video }: VideoListItemProps) {
  const navigate = useNavigate()

  const views = video.viewCount >= 1_000_000
    ? `${(video.viewCount / 1_000_000).toFixed(1)}M views`
    : video.viewCount >= 1_000
      ? `${(video.viewCount / 1_000).toFixed(0)}K views`
      : `${video.viewCount} views`

  // Security finding #6: use youtubeVideoId (not the DB primary key id)
  const handleClick = () => {
    localStorage.setItem('youtube-video-id', video.youtubeVideoId)
    localStorage.setItem('video-db-id', String(video.id))
    localStorage.setItem('video-is-removed', String(video.isRemoved))
    localStorage.setItem('video-title', video.title)
    navigate(`/watch/${video.youtubeVideoId}`)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 p-3 hover:bg-[#2a2a2a]/50 cursor-pointer transition-colors ${video.isRemoved ? 'opacity-50' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-label={`${video.title}${video.isRemoved ? ' (removed from YouTube)' : ''}`}
    >
      <div className="relative shrink-0">
        <img
          src={video.thumbnail.url}
          alt={video.title}
          className="w-40 rounded-md object-cover"
          style={{ aspectRatio: '16/9' }}
          loading="lazy"
        />
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-mono">
          {video.duration}
        </span>
        {video.isRemoved && (
          <span
            className="absolute top-1 left-1 bg-[#cc0000]/90 text-white text-xs px-1.5 py-0.5 rounded font-medium"
            role="status"
          >
            Removed
          </span>
        )}
      </div>
      <div className="flex flex-col justify-between min-w-0">
        <h3
          className={`text-sm font-medium line-clamp-2 leading-snug ${
            video.isRemoved
              ? 'text-[#888] line-through'
              : 'text-white'
          }`}
        >
          {video.title}
        </h3>
        <p className="text-xs text-[#999] mt-1">{video.channelTitle}</p>
        <p className="text-xs text-[#666]">{views}</p>
      </div>
    </div>
  )
}
