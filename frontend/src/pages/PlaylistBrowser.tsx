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
import AppShell from '../components/AppShell'
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

  const [personalVideoUrl, setPersonalVideoUrl] = useState('')
  const [personalVideoError, setPersonalVideoError] = useState<string | null>(null)
  const [personalVideoUrlValue, setPersonalVideoUrlValue] = useState<string | null>(null)
  const [isImportingPersonalVideo, setIsImportingPersonalVideo] = useState(false)

  const [oauthStatus, setOauthStatus] = useState<YouTubeStatus | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [remotePlaylists, setRemotePlaylists] = useState<YouTubeRemotePlaylist[]>([])
  const [isRemotePickerOpen, setIsRemotePickerOpen] = useState(false)
  const [selectedRemoteIds, setSelectedRemoteIds] = useState<Set<string>>(() => new Set())
  const [isLoadingRemote, setIsLoadingRemote] = useState(false)
  const [isImportingRemote, setIsImportingRemote] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)
  const [openPlaylistMenuId, setOpenPlaylistMenuId] = useState<number | null>(null)
  const fetchVersionRef = useRef(0)

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
      setRemoteError(err instanceof Error ? err.message : 'Failed to load YouTube playlists.')
    } finally {
      setIsLoadingRemote(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (!errorParam && !(code && state)) return

    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete('error')
    window.history.replaceState({}, '', url.toString())

    if (errorParam) {
      setOauthError(`YouTube authorization failed: ${errorParam}. Please try connecting again.`)
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
          setOauthError(err instanceof Error ? err.message : 'Failed to complete YouTube connection.')
        })
        .finally(() => {
          setIsCompleting(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleConnect = async () => {
    if (!token) return
    setIsConnecting(true)
    setOauthError(null)

    try {
      const { authUrl } = await getYouTubeAuthUrl(token)
      window.location.href = authUrl
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'Failed to start YouTube connection.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!token) return
    setIsDisconnecting(true)
    setOauthError(null)

    try {
      await disconnectYouTube(token)
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
      setOauthError(err instanceof Error ? err.message : 'Failed to disconnect YouTube.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = importUrl.trim()
    if (!trimmed) return

    setIsImporting(true)
    setImportError(null)
    setImportUrlValue(null)

    try {
      await importPlaylist(token!, trimmed)
      setImportUrl('')
      setIsLoading(true)
      setError(null)
      const refreshVersion = ++fetchVersionRef.current
      try {
        const data = await listPlaylists(token!)
        if (refreshVersion === fetchVersionRef.current) setPlaylists(data)
      } catch (err) {
        if (refreshVersion === fetchVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load playlists.')
        }
      } finally {
        if (refreshVersion === fetchVersionRef.current) setIsLoading(false)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
      setImportUrlValue(trimmed)
    } finally {
      setIsImporting(false)
    }
  }

  const handlePersonalVideoImport = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = personalVideoUrl.trim()
    if (!trimmed) return

    setIsImportingPersonalVideo(true)
    setPersonalVideoError(null)
    setPersonalVideoUrlValue(null)

    try {
      await importPersonalVideo(token!, trimmed)
      setPersonalVideoUrl('')
      setIsLoading(true)
      setError(null)
      const refreshVersion = ++fetchVersionRef.current
      try {
        const data = await listPlaylists(token!)
        if (refreshVersion === fetchVersionRef.current) setPlaylists(data)
      } catch (err) {
        if (refreshVersion === fetchVersionRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load playlists.')
        }
      } finally {
        if (refreshVersion === fetchVersionRef.current) setIsLoading(false)
      }
    } catch (err) {
      setPersonalVideoError(err instanceof Error ? err.message : 'Import failed.')
      setPersonalVideoUrlValue(trimmed)
    } finally {
      setIsImportingPersonalVideo(false)
    }
  }

  const toggleRemotePlaylist = (playlist: YouTubeRemotePlaylist) => {
    setSelectedRemoteIds((current) => {
      const next = new Set(current)
      if (next.has(playlist.youtubePlaylistId)) next.delete(playlist.youtubePlaylistId)
      else next.add(playlist.youtubePlaylistId)
      return next
    })
  }

  const handleOpenRemotePicker = () => {
    setIsRemotePickerOpen(true)
    if (remotePlaylists.length === 0) void loadRemotePlaylists()
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
      setRemoteError(err instanceof Error ? err.message : 'Failed to import selected playlists.')
    } finally {
      setIsImportingRemote(false)
    }
  }

  const handlePlaylistRefresh = async (playlist: Playlist) => {
    if (!token || refreshingId || unlinkingId || playlist.source === 'personal') return

    setRefreshingId(playlist.id)
    setOpenPlaylistMenuId(null)
    setError(null)

    try {
      const refreshed = await refreshPlaylist(token, playlist.id)
      setPlaylists((prev) => prev.map((current) => (current.id === refreshed.id ? refreshed : current)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh playlist.')
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
      setError(err instanceof Error ? err.message : 'Failed to unlink playlist.')
    } finally {
      setUnlinkingId(null)
    }
  }

  const handlePlaylistMenuToggle = (playlist: Playlist) => {
    setOpenPlaylistMenuId((currentId) => (currentId === playlist.id ? null : playlist.id))
  }

  const isOauthConnected = oauthStatus?.connected === true
  const selectedRemoteCount = selectedRemoteIds.size
  const totalVideos = playlists.reduce((sum, playlist) => sum + playlist.videoCount, 0)
  const personalCount = playlists.filter((playlist) => playlist.source === 'personal').length
  const oauthCount = playlists.filter((playlist) => playlist.source === 'oauth').length
  const urlCount = playlists.filter((playlist) => playlist.source === 'url').length

  const sidebarFooter = (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">YouTube Connection</span>
        <span className={`h-2 w-2 rounded-full ${isOauthConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      </div>
      <p className="text-xs text-slate-500">
        {isOauthConnected ? `Connected as ${oauthStatus!.channelTitle ?? 'YouTube'}` : 'Not connected'}
      </p>
      {isOauthConnected && (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="mt-3 w-full rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-50"
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      )}
    </div>
  )

  return (
    <AppShell active="library" sidebarFooter={sidebarFooter}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0e12]/88 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Library</span>
                <span>/</span>
                <span className="text-slate-300">Playlists</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Playlists</h1>
              <p className="mt-1 text-sm text-slate-500">
                Import, sync, and organize YouTube study material in one workspace.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center xl:max-w-3xl">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3-3" />
                  </svg>
                </span>
                <input
                  disabled
                  title="To be implemented later"
                  placeholder="Search playlists, notes, videos..."
                  className="control w-full rounded-md py-2 pl-9 pr-3 text-sm disabled:opacity-60"
                />
              </div>
              {isOauthConnected ? (
                <button
                  type="button"
                  onClick={handleOpenRemotePicker}
                  disabled={isDisconnecting}
                  className="rounded-md border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-500/15 disabled:opacity-50"
                >
                  Connected: {oauthStatus!.channelTitle ?? 'YouTube'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting || isCompleting}
                  className="btn-primary rounded-md px-4 py-2 text-sm font-semibold"
                >
                  {isConnecting ? 'Connecting...' : isCompleting ? 'Completing...' : 'Connect YouTube'}
                </button>
              )}
              <UserMenu />
            </div>
          </div>

          {oauthError && (
            <div className="mt-3 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {oauthError}
            </div>
          )}
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total Playlists', playlists.length],
              ['Total Videos', totalVideos],
              ['Imported from YouTube', oauthCount],
              ['URL / Personal', `${urlCount} / ${personalCount}`],
            ].map(([label, value]) => (
              <div key={label} className="surface-subtle rounded-md p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <form onSubmit={handleImport} className="surface rounded-md p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-500/10 text-xs font-bold text-red-200">
                  URL
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white">Import Playlist from URL</h2>
                  <p className="text-xs text-slate-500">Paste a public YouTube playlist URL.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
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
                  className="control min-w-0 flex-1 rounded-md px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={isImporting || !importUrl.trim()}
                  className="btn-primary shrink-0 rounded-md px-5 py-2 text-sm font-semibold"
                >
                  {isImporting ? 'Importing...' : 'Import Playlist'}
                </button>
              </div>
              {importError && (
                <div className="mt-3 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {importUrlValue && <span className="mb-1 block break-all text-slate-400">URL: {importUrlValue}</span>}
                  {importError}
                </div>
              )}
            </form>

            <form onSubmit={handlePersonalVideoImport} className="surface rounded-md p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 text-xs font-bold text-amber-200">
                  MY
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white">Add Single Video to My Playlist</h2>
                  <p className="text-xs text-slate-500">Paste a watch URL or video ID.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
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
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="control min-w-0 flex-1 rounded-md px-3 py-2 text-sm focus:!border-amber-400/70 focus:!shadow-[0_0_0_3px_rgba(245,158,11,0.16)]"
                />
                <button
                  type="submit"
                  disabled={isImportingPersonalVideo || !personalVideoUrl.trim()}
                  className="shrink-0 rounded-md border border-amber-400/25 bg-amber-500/80 px-5 py-2 text-sm font-semibold text-[#120b02] transition-colors hover:bg-amber-400 disabled:opacity-50"
                >
                  {isImportingPersonalVideo ? 'Adding...' : 'Add to My Playlist'}
                </button>
              </div>
              {personalVideoError && (
                <div className="mt-3 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {personalVideoUrlValue && (
                    <span className="mb-1 block break-all text-slate-400">URL: {personalVideoUrlValue}</span>
                  )}
                  {personalVideoError}
                </div>
              )}
            </form>
          </section>

          {isOauthConnected && isRemotePickerOpen && (
            <section className="surface rounded-md p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Import from YouTube</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Select playlists from your connected account, then save.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadRemotePlaylists}
                    disabled={isLoadingRemote || isImportingRemote}
                    className="btn-secondary rounded-md px-3 py-2 text-xs font-semibold"
                  >
                    {isLoadingRemote ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoteImport}
                    disabled={isImportingRemote}
                    className="rounded-md border border-blue-400/25 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    {isImportingRemote ? 'Saving...' : `Save (${selectedRemoteCount})`}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseRemotePicker}
                    disabled={isImportingRemote}
                    className="btn-ghost rounded-md px-3 py-2 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>

              {remoteError && (
                <div className="mt-3 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {remoteError}
                </div>
              )}

              {isLoadingRemote && remotePlaylists.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">Loading YouTube playlists...</p>
              )}

              {!isLoadingRemote && remotePlaylists.length === 0 && !remoteError && (
                <p className="mt-4 text-sm text-slate-500">No YouTube playlists are available for this account.</p>
              )}

              {remotePlaylists.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-md border border-white/10">
                  <div className="grid grid-cols-[32px_1fr_80px_92px] bg-white/[0.035] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span />
                    <span>Playlist</span>
                    <span>Videos</span>
                    <span>Status</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {remotePlaylists.map((playlist) => {
                      const isSelected = selectedRemoteIds.has(playlist.youtubePlaylistId)

                      return (
                        <label
                          key={playlist.youtubePlaylistId}
                          className={`grid grid-cols-[32px_1fr_80px_92px] items-center gap-3 border-t border-white/10 px-3 py-2 transition-colors ${
                            isSelected ? 'bg-blue-500/10' : 'hover:bg-white/[0.035]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isImportingRemote}
                            onChange={() => toggleRemotePlaylist(playlist)}
                            className="h-4 w-4 accent-blue-400"
                          />
                          <span className="flex min-w-0 items-center gap-3">
                            <img
                              src={playlist.thumbnailUrl || '/favicon.svg'}
                              alt=""
                              className="h-10 w-16 shrink-0 rounded object-cover"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-white">{playlist.title}</span>
                              <span className="block truncate text-xs text-slate-500">
                                {playlist.channelTitle || 'YouTube'}
                              </span>
                            </span>
                          </span>
                          <span className="text-sm text-slate-300">{playlist.videoCount}</span>
                          <span className="text-xs font-semibold text-slate-300">
                            {playlist.isImported ? 'Synced' : 'Import'}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Your Playlists</h2>
                <p className="text-sm text-slate-500">
                  {playlists.length === 0
                    ? 'Nothing imported yet.'
                    : `Showing ${playlists.length} playlist${playlists.length === 1 ? '' : 's'}.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-md px-3 py-2 text-xs">
                  Sort by: Last updated
                </button>
                <button type="button" disabled title="To be implemented later" className="btn-secondary rounded-md px-3 py-2 text-xs">
                  Grid
                </button>
              </div>
            </div>

            {isLoading && <div className="surface-subtle rounded-md p-6 text-sm text-slate-500">Loading playlists...</div>}

            {error && <div className="rounded-md border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-200">{error}</div>}

            {!isLoading && !error && playlists.length === 0 && (
              <div className="surface-subtle rounded-md p-10 text-center">
                <p className="text-sm text-slate-400">
                  Paste a YouTube playlist URL or add a video to My Playlist to get started.
                </p>
              </div>
            )}

            {!isLoading && !error && playlists.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
          </section>
        </main>
      </div>
    </AppShell>
  )
}
