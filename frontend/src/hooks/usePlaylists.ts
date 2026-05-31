import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { getPlaylists, linkPlaylistByUrl, hidePlaylist, unhidePlaylist, unlinkPlaylist, disconnectYouTube } from '../api/playlist'
import type { Playlist } from '../types/playlist'

export function usePlaylists() {
  const { token } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!token) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getPlaylists(token)
        if (!cancelled) setPlaylists(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load playlists')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token])

  const refresh = useCallback(async () => {
    if (!token) throw new Error('Not authenticated')

    setIsLoading(true)
    setError(null)

    try {
      const data = await getPlaylists(token)
      setPlaylists(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const linkByUrl = useCallback(
    async (url: string) => {
      if (!token) throw new Error('Not authenticated')
      await linkPlaylistByUrl(token, url)
      await refresh()
    },
    [token, refresh],
  )

  const hide = useCallback(
    async (id: number) => {
      if (!token) throw new Error('Not authenticated')
      await hidePlaylist(token, id)
      await refresh()
    },
    [token, refresh],
  )

  const unhide = useCallback(
    async (id: number) => {
      if (!token) throw new Error('Not authenticated')
      await unhidePlaylist(token, id)
      await refresh()
    },
    [token, refresh],
  )

  const unlink = useCallback(
    async (id: number) => {
      if (!token) throw new Error('Not authenticated')
      await unlinkPlaylist(token, id)
      await refresh()
    },
    [token, refresh],
  )

  const disconnect = useCallback(async () => {
    if (!token) throw new Error('Not authenticated')
    await disconnectYouTube(token)
    await refresh()
  }, [token, refresh])

  return {
    playlists,
    isLoading,
    error,
    refresh,
    linkByUrl,
    hide,
    unhide,
    unlink,
    disconnectYouTube: disconnect,
  }
}
