import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import UserMenu from '../components/UserMenu'
import { listNotes, type NoteListItem } from '../api/notes'
import { useAuth } from '../auth/useAuth'

function notePreview(content: string): string {
  const preview = content
    .replace(/```[\s\S]*?```/g, ' Code snippet ')
    .replace(/[^\p{L}\p{N}\s.,!?':;]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return preview || 'This note is empty.'
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Saved recently'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved recently'

  return `Updated ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}`
}

export default function NotesPage() {
  const { token } = useAuth()
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    let active = true
    listNotes(token)
      .then((data) => {
        if (!active) return
        setNotes(data)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load notes.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  return (
    <AppShell active="notes">
      <div className="min-h-screen">
        <header className="library-header sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-panel px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Library</span>
              <span>/</span>
              <span className="text-main">Notes</span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-main">Notes</h1>
          </div>
          <UserMenu />
        </header>

        <main className="p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-main">Your notes</h2>
            <p className="text-sm text-muted">
              {notes.length === 0
                ? 'Notes you create while watching videos will appear here.'
                : `${notes.length} saved note${notes.length === 1 ? '' : 's'}, newest first.`}
            </p>
          </div>

          {isLoading && (
            <div className="surface-subtle rounded-lg p-6 text-sm text-muted">Loading notes...</div>
          )}

          {error && (
            <div className="rounded-lg border border-accent bg-accent-soft p-6 text-sm text-danger">
              {error}
            </div>
          )}

          {!isLoading && !error && notes.length === 0 && (
            <div className="surface-subtle rounded-lg p-10 text-center">
              <p className="text-sm text-muted">Open a video and start writing to create your first note.</p>
            </div>
          )}

          {!isLoading && !error && notes.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {notes.map((note) => (
                <Link
                  key={note.id ?? note.youtubeVideoId}
                  to={`/watch/${encodeURIComponent(note.youtubeVideoId)}`}
                  state={{ isRemoved: note.videoIsRemoved }}
                  className="surface group flex min-w-0 gap-4 p-4 transition-colors hover:border-accent"
                >
                  {note.videoThumbnailUrl ? (
                    <img
                      src={note.videoThumbnailUrl}
                      alt=""
                      className="h-20 w-32 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted">
                      No thumbnail
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-main group-hover:text-danger">
                      {note.videoTitle || `Video ${note.youtubeVideoId}`}
                    </h3>
                    <p className="mt-1 truncate text-xs text-muted">
                      {note.videoChannelTitle || 'YouTube video'}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-main">
                      {notePreview(note.content)}
                    </p>
                    <p className="mt-3 text-[11px] text-muted">{formatUpdatedAt(note.updatedAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppShell>
  )
}
