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
      className={`flex gap-3 border-l-2 p-3 transition-colors ${
        isSelected
          ? 'border-[#e11d24] bg-red-500/10'
          : 'border-transparent hover:bg-white/[0.04]'
      } ${video.isRemoved ? 'opacity-60' : ''}`}
    >
      <div style={{ position: 'relative' }} className="shrink-0">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className={`w-28 rounded-md border border-white/10 object-cover sm:w-36 ${video.isRemoved ? 'grayscale-[30%]' : ''}`}
          style={{ aspectRatio: '16/9' }}
          loading="lazy"
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[10px] text-white">
          {video.duration}
        </span>
      </div>
      <div className="flex flex-col justify-between min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`line-clamp-2 text-sm font-medium leading-snug ${video.isRemoved ? 'text-slate-500' : 'text-slate-100'}`}>
            {video.title}
          </h3>
          {video.isRemoved && (
            <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#cc0000]/20 text-[#cc0000]">
              removed
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-slate-400">{video.channelTitle}</p>
        <p className="text-xs text-slate-600">{views}</p>
      </div>
    </div>
  )
}
