import { useNavigate } from 'react-router-dom'
import type { Video } from '../types/playlist'

interface VideoListItemProps {
  variant?: 'default' | 'queue'
  video: Video
  isSelected?: boolean
  onSelect?: (video: Video) => void
}

export default function VideoListItem({ video, isSelected, onSelect, variant = 'default' }: VideoListItemProps) {
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
      data-removed={video.isRemoved}
      role="button"
      tabIndex={0}
      aria-pressed={Boolean(isSelected)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleClick() } }}
      onClick={handleClick}
      className={`video-row ${variant === 'queue' ? 'queue-row' : ''} flex gap-3 border-l-2 p-3 transition-colors ${
        isSelected
          ? 'border-accent bg-accent-soft'
          : 'border-transparent hover:bg-muted'
      } `}
    >
      <div style={{ position: 'relative' }} className="shrink-0">
        <img
          src={video.thumbnailUrl || '/favicon.svg'}
          onError={(event) => {
            const image = event.currentTarget
            if (!image.src.endsWith('/favicon.svg')) image.src = '/favicon.svg'
          }}
          alt={video.title}
          className={`w-28 rounded-lg border border-line object-cover sm:w-36 ${video.isRemoved ? 'grayscale-[30%]' : ''}`}
          style={{ aspectRatio: '16/9' }}
          loading="lazy"
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 font-mono text-[10px] text-overlay">
          {video.duration}
        </span>
      </div>
      <div className="flex flex-col justify-between min-w-0">
        <div className="min-w-0 flex flex-wrap items-center gap-1">
          <h3 className={`line-clamp-2 text-sm font-medium leading-snug ${video.isRemoved ? 'text-muted' : 'text-main'}`}>
            {video.title}
          </h3>
          {video.isRemoved && (
            <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-accent-soft text-danger">
              removed
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted">{video.channelTitle}</p>
        <p className="text-xs text-muted">{views}</p>
      </div>
    </div>
  )
}
