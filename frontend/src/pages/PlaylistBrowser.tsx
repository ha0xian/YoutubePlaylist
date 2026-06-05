import { useCallback, useEffect, useState } from 'react'
import { listPlaylists, importPlaylist } from '../api/playlists'
import { useAuth } from '../auth/useAuth'
import type { Playlist } from '../types/playlist'
import PlaylistCard from '../components/PlaylistCard'
import UserMenu from '../components/UserMenu'

export default function PlaylistBrowser() {
  const { token } = useAuth()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importUrlValue, setImportUrlValue] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const fetchPlaylists = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await listPlaylists(token)
      setPlaylists(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists.')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

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
      await fetchPlaylists()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.'
      setImportError(message)
      setImportUrlValue(trimmed)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur-sm p-6 border-b border-[#333]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">Playlists</h1>
            <p className="text-sm text-[#999] mt-1">
              Import a public YouTube playlist URL or browse your collection
            </p>
          </div>
          <UserMenu />
        </div>

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
              No playlists yet. Paste a YouTube playlist URL above to get started.
            </p>
          </div>
        )}

        {!isLoading && !error && playlists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6">
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
