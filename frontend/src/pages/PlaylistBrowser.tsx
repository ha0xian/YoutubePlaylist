import { useNavigate } from 'react-router-dom'
import { usePlaylists } from '../hooks/usePlaylists'
import PlaylistCard from '../components/PlaylistCard'
import UserMenu from '../components/UserMenu'
import YouTubeLinkButton from '../components/YouTubeLinkButton'
import PlaylistUrlInput from '../components/PlaylistUrlInput'

export default function PlaylistBrowser() {
  const navigate = useNavigate()
  const { playlists, isLoading, error, linkByUrl, refresh } = usePlaylists()

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur-sm p-6 border-b border-[#333]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">Playlists</h1>
            <p className="text-sm text-[#999] mt-1">
              Browse and select a playlist to start watching
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Link YouTube Playlist section */}
      <section className="border-b border-[#333] bg-[#151515]">
        <div className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Link YouTube Playlist</h2>
          <div className="flex flex-col gap-3">
            <YouTubeLinkButton />
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[#333]" />
              <span className="text-xs text-[#666] uppercase font-medium">OR</span>
              <span className="h-px flex-1 bg-[#333]" />
            </div>
            <PlaylistUrlInput onLink={linkByUrl} isLoading={isLoading} />
          </div>
        </div>
      </section>

      <main className="p-6">
        {isLoading && playlists.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <span className="inline-block w-6 h-6 border-2 border-[#666] border-t-white rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-[#2a1a1a] border border-[#441111] p-3">
            <p className="text-sm text-[#ff6b6b]">{error}</p>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-2 text-xs text-[#6cb6ff] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && playlists.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#999] text-sm mb-2">No playlists yet</p>
            <p className="text-[#666] text-xs">
              Sign in with YouTube or paste a playlist URL above to get started.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {playlists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} />
          ))}
        </div>

        {/* Hidden playlists link */}
        <div className="mt-8 pt-4 border-t border-[#333]">
          <button
            type="button"
            onClick={() => navigate('/playlists/hidden')}
            className="text-sm text-[#999] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
          >
            View hidden playlists
          </button>
        </div>
      </main>
    </div>
  )
}
