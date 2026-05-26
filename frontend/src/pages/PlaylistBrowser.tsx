import { playlists } from '../data/mockData'
import PlaylistCard from '../components/PlaylistCard'
import UserMenu from '../components/UserMenu'

export default function PlaylistBrowser() {
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

      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6">
        {playlists.map((pl) => (
          <PlaylistCard key={pl.id} playlist={pl} />
        ))}
      </main>
    </div>
  )
}
