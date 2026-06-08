import { useNavigate } from 'react-router-dom'
import type { Video } from '../types/playlist'

interface VideoListItemProps {
  video: Video
  isSelected?: boolean
  onSelect?: (video: Video) => void
}

export default function VideoListItem({ video, isSelected, onSelect }: VideoListItemProps) {
  const navigate = useNavigate()

  const views = video.viewCount >= 1_000_000
    ? `${(video.viewCount / 1_000_000).toFixed(1)}M views`
    : video.viewCount >= 1_000
      ? `${(video.viewCount / 1_000).toFixed(0)}K views`
      : `${video.viewCount} views`

  const handleClick = () => {
    if (onSelect) {
      onSelect(video)
    } else {
      localStorage.setItem('youtube-video-id', video.youtubeVideoId)
      navigate(`/watch/${video.youtubeVideoId}`, {
        state: { isRemoved: video.isRemoved },
      })
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 p-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#2a2a2a] border-l-3 border-[#cc0000]'
          : 'hover:bg-[#2a2a2a]/50 border-l-3 border-transparent'
      } ${video.isRemoved ? 'opacity-60' : ''}`}
    >
      <div style={{ position: 'relative' }} className="shrink-0">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className={`w-40 rounded-md object-cover ${video.isRemoved ? 'grayscale-[30%]' : ''}`}
          style={{ aspectRatio: '16/9' }}
          loading="lazy"
        />
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded font-mono">
          {video.duration}
        </span>
      </div>
      <div className="flex flex-col justify-between min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-medium line-clamp-2 leading-snug ${video.isRemoved ? 'text-[#999]' : 'text-white'}`}>
            {video.title}
          </h3>
          {video.isRemoved && (
            <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#cc0000]/20 text-[#cc0000]">
              removed
            </span>
          )}
        </div>
        <p className="text-xs text-[#999] mt-1">{video.channelTitle}</p>
        <p className="text-xs text-[#666]">{views}</p>
      </div>
    </div>
  )
}
