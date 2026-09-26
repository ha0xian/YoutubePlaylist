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
  const sourceLabel =
    playlist.source === 'oauth'
      ? 'YouTube'
      : playlist.source === 'personal'
        ? 'My List'
        : 'URL'
  const sourceClass =
    playlist.source === 'oauth'
      ? 'border-accent bg-accent-soft text-accent'
      : playlist.source === 'personal'
        ? 'border-accent bg-accent-soft text-danger'
        : 'border-accent bg-accent-soft text-danger'

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="playlist-card group relative cursor-pointer rounded-xl border border-line bg-panel transition-colors hover:border-line"
    >
      <div className="relative overflow-hidden rounded-t-xl">
        <img
          src={playlist.thumbnailUrl}
          alt={playlist.title}
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
        <span className={`absolute left-2 top-2 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur ${sourceClass}`}>
          {sourceLabel}
        </span>
        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[11px] font-medium text-overlay">
          {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
        </span>
      </div>
      <div className="space-y-2 p-3.5">
        <div className="relative flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-sm font-semibold text-main line-clamp-2 leading-snug">
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
                className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-muted transition-colors hover:bg-muted hover:text-main focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
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
                  className="absolute right-0 top-8 z-20 min-w-32 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onRefresh && playlist.source !== 'personal' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onMenuClose?.()
                        onRefresh(playlist)
                      }}
                      disabled={isActionRunning}
                      className="block w-full bg-transparent px-3 py-2 text-left text-sm text-main transition-colors hover:bg-muted hover:text-main disabled:opacity-50"
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
                      className="block w-full bg-transparent px-3 py-2 text-left text-sm text-main transition-colors hover:bg-muted hover:text-danger disabled:opacity-50"
                    >
                      {isUnlinking ? 'Unlinking...' : 'Unlink'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="truncate text-xs text-muted">{playlist.channelTitle}</p>
        <p className="text-xs text-muted">
          Updated {playlist.publishedAt ? new Date(playlist.publishedAt).toLocaleDateString() : 'recently'}
        </p>
      </div>
    </div>
  )
}
