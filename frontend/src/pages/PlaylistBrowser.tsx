import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  listPlaylists,
  importPlaylist,
  importPersonalVideo,
  refreshPlaylist,
  unlinkPlaylist,
} from '../api/playlists'
import {
  getYouTubeStatus,
  getYouTubeAuthUrl,
  completeYouTubeOAuth,
  disconnectYouTube,
  listYouTubePlaylists,
  importYouTubePlaylists,
  type YouTubeRemotePlaylist,
  type YouTubeStatus,
} from '../api/youtube'
import { useAuth } from '../auth/useAuth'
import type { Playlist } from '../types/playlist'
import PlaylistCard from '../components/PlaylistCard'
import UserMenu from '../components/UserMenu'

export default function PlaylistBrowser() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importUrlValue, setImportUrlValue] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Personal video import state
  const [personalVideoUrl, setPersonalVideoUrl] = useState('')
  const [personalVideoError, setPersonalVideoError] = useState<string | null>(null)
  const [personalVideoUrlValue, setPersonalVideoUrlValue] = useState<string | null>(null)
  const [isImportingPersonalVideo, setIsImportingPersonalVideo] = useState(false)

  // YouTube OAuth state
  const [oauthStatus, setOauthStatus] = useState<YouTubeStatus | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [remotePlaylists, setRemotePlaylists] = useState<YouTubeRemotePlaylist[]>([])
  const [isRemotePickerOpen, setIsRemotePickerOpen] = useState(false)
  const [selectedRemoteIds, setSelectedRemoteIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [isLoadingRemote, setIsLoadingRemote] = useState(false)
  const [isImportingRemote, setIsImportingRemote] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)
  const [openPlaylistMenuId, setOpenPlaylistMenuId] = useState<number | null>(
    null,
  )
  const fetchVersionRef = useRef(0)

  // ── Load playlists ──────────────────────────────────────────────────────

  const loadPlaylists = useCallback(() => {
    if (!token) return

    const version = ++fetchVersionRef.current

    listPlaylists(token)
      .then((data) => {
        if (version === fetchVersionRef.current) {
          setPlaylists(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (version === fetchVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load playlists.')
          setIsLoading(false)
        }
      })

    return () => {
      fetchVersionRef.current = -1
    }
  }, [token])

  useEffect(() => {
    const cleanup = loadPlaylists()
    return cleanup
  }, [loadPlaylists])

  // ── Load OAuth status ───────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return

    getYouTubeStatus(token)
      .then((status) => {
        setOauthStatus(status)
        if (!status.connected) {
          setRemotePlaylists([])
          setIsRemotePickerOpen(false)
          setSelectedRemoteIds(new Set())
        }
      })
      .catch(() => setOauthStatus(null))
  }, [token])

  const loadRemotePlaylists = useCallback(async () => {
    if (!token) return
    setIsLoadingRemote(true)
    setRemoteError(null)

    try {
      const data = await listYouTubePlaylists(token)
      setRemotePlaylists(data)
      setSelectedRemoteIds(
        new Set(
          data
            .filter((playlist) => playlist.isImported)
            .map((playlist) => playlist.youtubePlaylistId),
        ),
      )
    } catch (err) {
      setRemoteError(
        err instanceof Error
          ? err.message
          : 'Failed to load YouTube playlists.',
      )
    } finally {
      setIsLoadingRemote(false)
    }
  }, [token])

  // ── Handle OAuth callback query params ──────────────────────────────────
  //
  // This effect synchronizes React state with the browser URL after Google's
  // OAuth redirect — a genuinely external system outside React's control.
  // Calling setState here is the documented valid exception to the
  // react-hooks/set-state-in-effect rule.

  useEffect(() => {
    if (!token) return

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (!errorParam && !(code && state)) return

    // Clean the URL immediately so callback params don't survive a refresh
    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete('error')
    window.history.replaceState({}, '', url.toString())

    if (errorParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOauthError(
        `YouTube authorization failed: ${errorParam}. Please try connecting again.`,
      )
      return
    }

    if (code && state) {
      setIsCompleting(true)
      setOauthError(null)

      completeYouTubeOAuth(token, { code, state })
        .then(() => getYouTubeStatus(token))
        .then((status) => {
          setOauthStatus(status)
          return undefined
        })
        .catch((err) => {
          setOauthError(
            err instanceof Error
              ? err.message
              : 'Failed to complete YouTube connection.',
          )
        })
        .finally(() => {
          setIsCompleting(false)
        })
    }
    // Only run on mount / when token becomes available — not on every
    // searchParams change (we already consumed them).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Connect YouTube ─────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!token) return
    setIsConnecting(true)
    setOauthError(null)

    try {
      const { authUrl } = await getYouTubeAuthUrl(token)
      window.location.href = authUrl
    } catch (err) {
      setOauthError(
        err instanceof Error
          ? err.message
          : 'Failed to start YouTube connection.',
      )
      setIsConnecting(false)
    }
  }

  // ── Disconnect YouTube ──────────────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!token) return
    setIsDisconnecting(true)
    setOauthError(null)

    try {
      await disconnectYouTube(token)
      // Refresh playlists and status
      const [status, refreshedPlaylists] = await Promise.all([
        getYouTubeStatus(token),
        listPlaylists(token),
      ])
      setOauthStatus(status)
      setPlaylists(refreshedPlaylists)
      setRemotePlaylists([])
      setIsRemotePickerOpen(false)
      setSelectedRemoteIds(new Set())
      setRemoteError(null)
    } catch (err) {
      setOauthError(
        err instanceof Error
          ? err.message
          : 'Failed to disconnect YouTube.',
      )
    } finally {
      setIsDisconnecting(false)
    }
  }

  // ── URL import handler ──────────────────────────────────────────────────

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = importUrl.trim()
    if (!trimmed) return

    setIsImporting(true)
    setImportError(null)
    setImportUrlValue(null)

    try {
      await importPlaylist(token!, trimmed)
      setImportUrl('')
      // Refresh playlist list after import
      setIsLoading(true)
      setError(null)
      const refreshVersion = ++fetchVersionRef.current
      try {
        const data = await listPlaylists(token!)
        if (refreshVersion === fetchVersionRef.current) {
          setPlaylists(data)
        }
      } catch (err) {
        if (refreshVersion === fetchVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load playlists.')
        }
      } finally {
        if (refreshVersion === fetchVersionRef.current) {
          setIsLoading(false)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.'
      setImportError(message)
      setImportUrlValue(trimmed)
    } finally {
      setIsImporting(false)
    }
  }

  // ── Personal video import handler ───────────────────────────────────────

  const handlePersonalVideoImport = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = personalVideoUrl.trim()
    if (!trimmed) return

    setIsImportingPersonalVideo(true)
    setPersonalVideoError(null)
    setPersonalVideoUrlValue(null)

    try {
      await importPersonalVideo(token!, trimmed)
      setPersonalVideoUrl('')
      // Refresh playlist list after import
      setIsLoading(true)
      setError(null)
      const refreshVersion = ++fetchVersionRef.current
      try {
        const data = await listPlaylists(token!)
        if (refreshVersion === fetchVersionRef.current) {
          setPlaylists(data)
        }
      } catch (err) {
        if (refreshVersion === fetchVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load playlists.')
        }
      } finally {
        if (refreshVersion === fetchVersionRef.current) {
          setIsLoading(false)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.'
      setPersonalVideoError(message)
      setPersonalVideoUrlValue(trimmed)
    } finally {
      setIsImportingPersonalVideo(false)
    }
  }

  const toggleRemotePlaylist = (playlist: YouTubeRemotePlaylist) => {
    setSelectedRemoteIds((current) => {
      const next = new Set(current)
      if (next.has(playlist.youtubePlaylistId)) {
        next.delete(playlist.youtubePlaylistId)
      } else {
        next.add(playlist.youtubePlaylistId)
      }
      return next
    })
  }

  const handleOpenRemotePicker = () => {
    setIsRemotePickerOpen(true)
    if (remotePlaylists.length === 0) {
      void loadRemotePlaylists()
    }
  }

  const handleCloseRemotePicker = () => {
    setIsRemotePickerOpen(false)
    setSelectedRemoteIds(new Set())
    setRemoteError(null)
  }

  const handleRemoteImport = async () => {
    if (!token) return

    setIsImportingRemote(true)
    setRemoteError(null)

    try {
      await importYouTubePlaylists(token, [...selectedRemoteIds])
      const [refreshedLocal, refreshedRemote] = await Promise.all([
        listPlaylists(token),
        listYouTubePlaylists(token),
      ])
      setPlaylists(refreshedLocal)
      setRemotePlaylists(refreshedRemote)
      setSelectedRemoteIds(
        new Set(
          refreshedRemote
            .filter((playlist) => playlist.isImported)
            .map((playlist) => playlist.youtubePlaylistId),
        ),
      )
    } catch (err) {
      setRemoteError(
        err instanceof Error
          ? err.message
          : 'Failed to import selected playlists.',
      )
    } finally {
      setIsImportingRemote(false)
    }
  }

  const handlePlaylistRefresh = async (playlist: Playlist) => {
    if (!token || refreshingId || unlinkingId) return
    if (playlist.source === 'personal') return

    setRefreshingId(playlist.id)
    setOpenPlaylistMenuId(null)
    setError(null)

    try {
      const refreshed = await refreshPlaylist(token, playlist.id)
      setPlaylists((prev) =>
        prev.map((current) =>
          current.id === refreshed.id ? refreshed : current,
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh playlist.',
      )
    } finally {
      setRefreshingId(null)
    }
  }

  const handlePlaylistUnlink = async (playlist: Playlist) => {
    if (!token || unlinkingId || refreshingId) return

    setUnlinkingId(playlist.id)
    setOpenPlaylistMenuId(null)
    setError(null)

    try {
      await unlinkPlaylist(token, playlist.id)
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to unlink playlist.',
      )
    } finally {
      setUnlinkingId(null)
    }
  }

  const handlePlaylistMenuToggle = (playlist: Playlist) => {
    setOpenPlaylistMenuId((currentId) =>
      currentId === playlist.id ? null : playlist.id,
    )
  }

  const isOauthConnected = oauthStatus?.connected === true
  const selectedRemoteCount = selectedRemoteIds.size

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur-sm p-6 border-b border-[#333]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">Playlists</h1>
            <p className="text-sm text-[#999] mt-1">
              Import a public YouTube playlist URL or add videos to My Playlist
            </p>
          </div>
          <UserMenu />
        </div>

        {/* ── OAuth connect / status row ─────────────────────────────── */}
        <div className="mt-3 flex items-center gap-3">
          {isOauthConnected ? (
            <>
              <span className="text-xs text-[#3ea6ff]">
                Connected: {oauthStatus!.channelTitle ?? 'YouTube'}
              </span>
              <button
                type="button"
                onClick={handleOpenRemotePicker}
                disabled={isDisconnecting}
                className="bg-[#3ea6ff] text-[#0f0f0f] text-xs px-3 py-1.5 rounded font-medium hover:bg-[#7ec5ff] transition-colors disabled:opacity-50"
              >
                Import from YouTube
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-xs text-[#999] hover:text-[#ff6b6b] transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting || isCompleting}
              className="bg-[#cc0000] text-white text-sm px-4 py-1.5 rounded font-medium hover:bg-[#aa0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting
                ? 'Connecting…'
                : isCompleting
                  ? 'Completing connection…'
                  : 'Connect YouTube'}
            </button>
          )}
        </div>

        {oauthError && (
          <div className="mt-2 text-sm text-[#ff6b6b]">{oauthError}</div>
        )}

        {/* ── URL import form ────────────────────────────────────────── */}
        {isOauthConnected && isRemotePickerOpen && (
          <section className="mt-4 border-t border-[#333] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  YouTube playlists
                </h2>
                <p className="text-xs text-[#999] mt-1">
                  Check the playlists you want in your app, then save.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadRemotePlaylists}
                  disabled={isLoadingRemote || isImportingRemote}
                  className="text-xs text-[#3ea6ff] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isLoadingRemote ? 'Loading...' : 'Reload'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoteImport}
                  disabled={isImportingRemote}
                  className="bg-[#3ea6ff] text-[#0f0f0f] text-sm px-4 py-1.5 rounded font-medium hover:bg-[#7ec5ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImportingRemote
                    ? 'Saving...'
                    : `Save (${selectedRemoteCount})`}
                </button>
                <button
                  type="button"
                  onClick={handleCloseRemotePicker}
                  disabled={isImportingRemote}
                  className="text-xs text-[#999] hover:text-white transition-colors disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>

            {remoteError && (
              <div className="mt-2 text-sm text-[#ff6b6b]">{remoteError}</div>
            )}

            {isLoadingRemote && remotePlaylists.length === 0 && (
              <p className="mt-3 text-sm text-[#999]">
                Loading YouTube playlists...
              </p>
            )}

            {!isLoadingRemote && remotePlaylists.length === 0 && !remoteError && (
              <p className="mt-3 text-sm text-[#999]">
                No YouTube playlists are available for this account.
              </p>
            )}

            {remotePlaylists.length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {remotePlaylists.map((playlist) => {
                  const isSelected = selectedRemoteIds.has(
                    playlist.youtubePlaylistId,
                  )

                  return (
                    <label
                      key={playlist.youtubePlaylistId}
                      className={`flex gap-3 rounded border p-3 transition-colors ${
                        isSelected
                          ? 'border-[#3ea6ff] bg-[#152333]'
                          : 'border-[#333] bg-[#181818] hover:border-[#555]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isImportingRemote}
                        onChange={() => toggleRemotePlaylist(playlist)}
                        className="mt-8 h-4 w-4 accent-[#3ea6ff]"
                      />
                      <img
                        src={playlist.thumbnailUrl || '/favicon.svg'}
                        alt=""
                        className="h-20 w-28 rounded object-cover bg-[#222] shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white truncate">
                          {playlist.title}
                        </span>
                        <span className="block text-xs text-[#999] truncate mt-1">
                          {playlist.channelTitle || 'YouTube'}
                        </span>
                        <span className="block text-xs text-[#777] mt-1">
                          {playlist.videoCount} videos
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </section>
        )}

        <form onSubmit={handleImport} className="mt-4 flex gap-2">
          <input
            type="text"
            value={importUrl}
            onChange={(e) => {
              setImportUrl(e.target.value)
              if (importError) {
                setImportError(null)
                setImportUrlValue(null)
              }
            }}
            placeholder="https://www.youtube.com/playlist?list=PL..."
            className="flex-1 bg-[#2a2a2a] text-white text-sm px-3 py-2 rounded border border-[#444] focus:outline-none focus:border-[#cc0000] placeholder-[#666]"
          />
          <button
            type="submit"
            disabled={isImporting || !importUrl.trim()}
            className="bg-[#cc0000] text-white text-sm px-5 py-2 rounded font-medium hover:bg-[#aa0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isImporting ? 'Importing…' : 'Import'}
          </button>
        </form>

        {importError && (
          <div className="mt-2 text-sm text-[#ff6b6b]">
            {importUrlValue && (
              <span className="block text-[#999] break-all mb-1">
                URL: {importUrlValue}
              </span>
            )}
            {importError}
          </div>
        )}

        {/* ── Personal video import form ─────────────────────────────── */}
        <form onSubmit={handlePersonalVideoImport} className="mt-3 flex gap-2">
          <input
            type="text"
            value={personalVideoUrl}
            onChange={(e) => {
              setPersonalVideoUrl(e.target.value)
              if (personalVideoError) {
                setPersonalVideoError(null)
                setPersonalVideoUrlValue(null)
              }
            }}
            placeholder="Add a video to My Playlist — paste a YouTube watch URL or video ID"
            className="flex-1 bg-[#2a2a2a] text-white text-sm px-3 py-2 rounded border border-[#444] focus:outline-none focus:border-[#ff8c00] placeholder-[#666]"
          />
          <button
            type="submit"
            disabled={isImportingPersonalVideo || !personalVideoUrl.trim()}
            className="bg-[#ff8c00] text-[#0f0f0f] text-sm px-5 py-2 rounded font-medium hover:bg-[#ffaa33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isImportingPersonalVideo ? 'Adding…' : 'Add to My Playlist'}
          </button>
        </form>

        {personalVideoError && (
          <div className="mt-2 text-sm text-[#ff6b6b]">
            {personalVideoUrlValue && (
              <span className="block text-[#999] break-all mb-1">
                URL: {personalVideoUrlValue}
              </span>
            )}
            {personalVideoError}
          </div>
        )}
      </header>

      <main>
        {isLoading && (
          <p className="text-sm text-[#999] p-6">Loading playlists…</p>
        )}

        {error && (
          <p className="text-sm text-[#ff6b6b] p-6">{error}</p>
        )}

        {!isLoading && !error && playlists.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-sm text-[#999]">
              No playlists yet. Paste a YouTube playlist URL or add a video to My Playlist above to get started.
            </p>
          </div>
        )}

        {!isLoading && !error && playlists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6">
            {playlists.map((pl) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                onRefresh={handlePlaylistRefresh}
                onUnlink={handlePlaylistUnlink}
                isRefreshing={refreshingId === pl.id}
                isUnlinking={unlinkingId === pl.id}
                isMenuOpen={openPlaylistMenuId === pl.id}
                onMenuToggle={handlePlaylistMenuToggle}
                onMenuClose={() => setOpenPlaylistMenuId(null)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
