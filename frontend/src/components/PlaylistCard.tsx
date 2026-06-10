import { useNavigate } from 'react-router-dom'
import type { Playlist } from '../types/playlist'

interface PlaylistCardProps {
  playlist: Playlist
  onRefresh?: (playlist: Playlist) => void
  onUnlink?: (playlist: Playlist) => void
  isRefreshing?: boolean
  isUnlinking?: boolean
  isMenuOpen?: boolean
  onMenuToggle?: (playlist: Playlist) => void
  onMenuClose?: () => void
}

export default function PlaylistCard({
  playlist,
  onRefresh,
  onUnlink,
  isRefreshing,
  isUnlinking,
  isMenuOpen = false,
  onMenuToggle,
  onMenuClose,
}: PlaylistCardProps) {
  const navigate = useNavigate()
  const isActionRunning = Boolean(isRefreshing || isUnlinking)
  const hasMenuActions = Boolean(onRefresh || onUnlink)

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
      </div>
      <div className="p-3 space-y-1">
        <div className="relative flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-semibold text-white line-clamp-2 leading-snug">
            {playlist.title}
          </h3>
          {hasMenuActions && (
            <div className="relative -mr-1 -mt-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMenuToggle?.(playlist)
                }}
                disabled={isActionRunning}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                title="Playlist actions"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-[#999] transition-colors hover:bg-[#2a2a2a] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#3ea6ff] disabled:opacity-50"
              >
                <span className="sr-only">Playlist actions</span>
                <span className="flex flex-col gap-0.5" aria-hidden="true">
                  <span className="h-1 w-1 rounded-full bg-current" />
                  <span className="h-1 w-1 rounded-full bg-current" />
                  <span className="h-1 w-1 rounded-full bg-current" />
                </span>
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-8 z-20 min-w-32 overflow-hidden rounded-md border border-[#333] bg-[#202020] py-1 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onRefresh && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onMenuClose?.()
                        onRefresh(playlist)
                      }}
                      disabled={isActionRunning}
                      className="block w-full bg-transparent px-3 py-2 text-left text-sm text-[#ddd] transition-colors hover:bg-[#333] hover:text-white disabled:opacity-50"
                    >
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                  {onUnlink && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onMenuClose?.()
                        onUnlink(playlist)
                      }}
                      disabled={isActionRunning}
                      className="block w-full bg-transparent px-3 py-2 text-left text-sm text-[#ddd] transition-colors hover:bg-[#333] hover:text-[#ff6b6b] disabled:opacity-50"
                    >
                      {isUnlinking ? 'Unlinking...' : 'Unlink'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-[#999]">{playlist.channelTitle}</p>
        <p className="text-xs text-[#666]">
          {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
        </p>
      </div>
    </div>
  )
}
