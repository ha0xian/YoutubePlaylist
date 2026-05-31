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

  return (
    <div
      onClick={() => {
        localStorage.setItem('youtube-video-id', video.youtubeVideoId)
        navigate(`/watch/${video.youtubeVideoId}`)
      }}
      className="flex gap-3 p-3 hover:bg-[#2a2a2a]/50 cursor-pointer transition-colors"
    >
      <div style={{ position: 'relative' }} className="shrink-0">
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
      </div>
      <div className="flex flex-col justify-between min-w-0">
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug">
          {video.title}
        </h3>
        <p className="text-xs text-[#999] mt-1">{video.channelTitle}</p>
        <p className="text-xs text-[#666]">{views}</p>
      </div>
    </div>
  )
}
