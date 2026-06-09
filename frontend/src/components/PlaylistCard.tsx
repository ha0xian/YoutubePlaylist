import { useNavigate } from 'react-router-dom'
import type { Playlist } from '../types/playlist'

interface PlaylistCardProps {
  playlist: Playlist
  onUnlink?: (playlist: Playlist) => void
  isUnlinking?: boolean
}

export default function PlaylistCard({
  playlist,
  onUnlink,
  isUnlinking,
}: PlaylistCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="bg-[#1a1a1a] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#cc0000] hover:ring-offset-2 hover:ring-offset-[#0f0f0f] group relative"
    >
      <div style={{ position: 'relative' }}>
        <img
          src={playlist.thumbnailUrl}
          alt={playlist.title}
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
        {playlist.source === 'url' && (
          <span className="absolute top-2 left-2 bg-black/70 text-[#999] text-[10px] px-1.5 py-0.5 rounded">
            URL
          </span>
        )}
        {playlist.source === 'oauth' && (
          <span className="absolute top-2 left-2 bg-black/70 text-[#3ea6ff] text-[10px] px-1.5 py-0.5 rounded">
            YouTube
          </span>
        )}
        {onUnlink && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onUnlink(playlist)
            }}
            disabled={isUnlinking}
            title="Unlink playlist"
            className="absolute top-2 right-2 bg-black/70 text-[#999] hover:text-[#ff6b6b] text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 cursor-pointer border-none"
          >
            {isUnlinking ? '…' : '✕'}
          </button>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug">
          {playlist.title}
        </h3>
        <p className="text-xs text-[#999]">{playlist.channelTitle}</p>
        <p className="text-xs text-[#666]">
          {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
        </p>
      </div>
    </div>
  )
}
