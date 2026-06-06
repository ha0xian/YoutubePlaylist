import { useState, useEffect, useCallback, useRef } from 'react'
import { marked } from 'marked'
import CodeMirrorMarkdownEditor from './CodeMirrorMarkdownEditor'
import { useAuth } from '../auth/useAuth'
import { getNote, saveNote } from '../api/notes'

const EDITOR_MODE_KEY = 'youtube-notes:editor-mode'

type MarkdownEditorMode = 'source' | 'live-preview'

interface MarkdownNotesProps {
  videoId?: string
}

function readEditorMode(): MarkdownEditorMode {
  return localStorage.getItem(EDITOR_MODE_KEY) === 'source' ? 'source' : 'live-preview'
}

export default function MarkdownNotes({ videoId }: MarkdownNotesProps) {
  const { token } = useAuth()
  const noteKey = token && videoId ? `${token}:${videoId}` : ''

  const [notes, setNotes] = useState('')
  const [loadedNoteKey, setLoadedNoteKey] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editorMode, setEditorMode] = useState<MarkdownEditorMode>(readEditorMode)
  const lastSavedNotesRef = useRef('')
  const isLoaded = Boolean(noteKey && loadedNoteKey === noteKey)
  const isLoading = Boolean(noteKey && !isLoaded && !loadError)

  useEffect(() => {
    if (!token || !videoId) return undefined

    let isActive = true

    getNote(token, videoId)
      .then((note) => {
        if (!isActive) return
        setNotes(note.content)
        lastSavedNotesRef.current = note.content
        setLoadedNoteKey(noteKey)
        setLoadError(null)
        setSaveError(null)
      })
      .catch((err) => {
        if (!isActive) return
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load notes.',
        )
      })

    return () => {
      isActive = false
    }
  }, [token, videoId, noteKey])

  useEffect(() => {
    if (
      !token ||
      !videoId ||
      !isLoaded ||
      isLoading ||
      loadError ||
      notes === lastSavedNotesRef.current
    ) {
      return undefined
    }

    let isActive = true
    const pendingNotes = notes
    const timeoutId = window.setTimeout(() => {
      setIsSaving(true)
      saveNote(token, videoId, pendingNotes)
        .then((note) => {
          if (!isActive) return
          lastSavedNotesRef.current = note.content
          setSaveError(null)
        })
        .catch((err) => {
          if (!isActive) return
          setSaveError(
            err instanceof Error ? err.message : 'Failed to save notes.',
          )
        })
        .finally(() => {
          if (isActive) setIsSaving(false)
        })
    }, 500)

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
    }
  }, [token, videoId, notes, isLoaded, isLoading, loadError])

  useEffect(() => {
    localStorage.setItem(EDITOR_MODE_KEY, editorMode)
  }, [editorMode])

  const renderedHtml = useCallback(() => {
    return { __html: marked.parse(notes) as string }
  }, [notes])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#333] shrink-0">
        <h2 className="text-base font-semibold">Notes (Markdown)</h2>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-[#999]">Saving...</span>
          )}
          {!showPreview && (
            <div className="flex rounded-md border border-[#444] overflow-hidden">
              <button
                type="button"
                onClick={() => setEditorMode('source')}
                className="py-1.5 px-3 text-xs cursor-pointer border-r border-[#444]"
                style={{ background: editorMode === 'source' ? '#2a5a9a' : '#2a2a2a' }}
              >
                Source
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('live-preview')}
                className="py-1.5 px-3 text-xs cursor-pointer"
                style={{ background: editorMode === 'live-preview' ? '#2a5a9a' : '#2a2a2a' }}
              >
                Live Preview
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            style={{ background: showPreview ? '#2a5a9a' : '#2a2a2a' }}
            className="py-1.5 px-3.5 border border-[#444] rounded-md text-[#e0e0e0] text-xs cursor-pointer"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center p-4 text-sm text-[#999]">
            Loading notes...
          </div>
        ) : loadError ? (
          <div className="h-full flex items-center justify-center p-4 text-sm text-[#ff8a8a] text-center">
            {loadError}
          </div>
        ) : showPreview ? (
          <div
            className="markdown-preview p-4 h-full overflow-y-auto"
            dangerouslySetInnerHTML={renderedHtml()}
            style={{ lineHeight: 1.6 }}
          />
        ) : (
          <>
            {saveError && (
              <div className="px-4 py-2 bg-[#3a1f1f] text-xs text-[#ffb3b3] border-b border-[#5c2f2f]">
                {saveError}
              </div>
            )}
            <CodeMirrorMarkdownEditor
              value={notes}
              onChange={setNotes}
              livePreview={editorMode === 'live-preview'}
              placeholder="Write your notes here..."
            />
          </>
        )}
      </div>
    </div>
  )
}
