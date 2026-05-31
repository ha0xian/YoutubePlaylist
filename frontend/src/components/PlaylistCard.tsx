import { useNavigate } from 'react-router-dom'
import type { Playlist } from '../types/playlist'

interface PlaylistCardProps {
  playlist: Playlist
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const navigate = useNavigate()

  const isHidden = playlist.isHidden
  const isUnlinked = playlist.isUnlinked
  const showOverlay = isHidden || isUnlinked

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className={`bg-[#1a1a1a] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-[#cc0000] hover:ring-offset-2 hover:ring-offset-[#0f0f0f] ${showOverlay ? 'opacity-50' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/playlist/${playlist.id}`)
        }
      }}
      aria-label={`${playlist.title}${isHidden ? ' (hidden)' : ''}${isUnlinked ? ' (unlinked)' : ''}`}
    >
      <div className="relative">
        <img
          src={playlist.thumbnailUrl}
          alt={playlist.title}
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
        {/* Source type badge */}
        <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-medium">
          {playlist.sourceType === 'oauth' ? 'YouTube' : 'Link'}
        </span>
        {/* Hidden/unlinked overlay badge */}
        {isHidden && (
          <span
            className="absolute top-2 right-2 bg-[#663300]/80 text-[#ffaa33] text-xs px-2 py-0.5 rounded font-medium"
            role="status"
          >
            Hidden
          </span>
        )}
        {isUnlinked && (
          <span
            className="absolute top-2 right-2 bg-[#441111]/80 text-[#ff6b6b] text-xs px-2 py-0.5 rounded font-medium"
            role="status"
          >
            Unlinked
          </span>
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
