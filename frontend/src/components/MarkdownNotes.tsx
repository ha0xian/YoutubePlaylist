import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import CodeMirrorMarkdownEditor from './CodeMirrorMarkdownEditor'
import AIAnalysisPanel from './AIAnalysisPanel'
import { useAuth } from '../auth/useAuth'
import { getNote, saveNote } from '../api/notes'

const EDITOR_MODE_KEY = 'youtube-notes:editor-mode'

type MarkdownEditorMode = 'source' | 'live-preview'
type NotesWorkspaceTab = 'notes' | 'ai'

interface MarkdownNotesProps {
  videoId?: string
  getCurrentTime?: () => number | null
  onSeekToTime?: (seconds: number) => void
}

function formatTimestamp(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function readEditorMode(): MarkdownEditorMode {
  return localStorage.getItem(EDITOR_MODE_KEY) === 'source' ? 'source' : 'live-preview'
}

export default function MarkdownNotes({ videoId, getCurrentTime, onSeekToTime }: MarkdownNotesProps) {
  const { token } = useAuth()
  const noteKey = token && videoId ? `${token}:${videoId}` : ''

  const [notes, setNotes] = useState('')
  const [loadedNoteKey, setLoadedNoteKey] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editorMode, setEditorMode] = useState<MarkdownEditorMode>(readEditorMode)
  const [activeTab, setActiveTab] = useState<NotesWorkspaceTab>('notes')
  const lastSavedNotesRef = useRef('')
  const saveAbortRef = useRef<AbortController | null>(null)
  const unmountingRef = useRef(false)
  const isLoaded = Boolean(noteKey && loadedNoteKey === noteKey)
  const isLoading = Boolean(noteKey && !isLoaded && !loadError)

  // Track unmount so the save effect can flush pending writes instead of
  // aborting them when the component leaves the tree.
  useEffect(() => {
    unmountingRef.current = false
    return () => {
      unmountingRef.current = true
    }
  }, [])

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

    // Abort the previous in-flight save so it can't overwrite a newer save.
    saveAbortRef.current?.abort()

    let isActive = true
    const pendingNotes = notes
    const controller = new AbortController()
    saveAbortRef.current = controller

    const timeoutId = window.setTimeout(() => {
      setIsSaving(true)
      saveNote(token, videoId, pendingNotes, controller.signal)
        .then((note) => {
          if (!isActive) return
          lastSavedNotesRef.current = note.content
          setSaveError(null)
        })
        .catch((err) => {
          if (!isActive || (err instanceof DOMException && err.name === 'AbortError')) return
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

      if (unmountingRef.current) {
        // Component is leaving the tree.  Flush unsaved changes immediately
        // instead of losing them.  Don't pass a signal so this save can't be
        // aborted.
        if (notes !== lastSavedNotesRef.current) {
          saveNote(token, videoId, notes).catch(() => {})
        }
      } else {
        controller.abort()
      }
    }
  }, [token, videoId, notes, isLoaded, isLoading, loadError])

  useEffect(() => {
    localStorage.setItem(EDITOR_MODE_KEY, editorMode)
  }, [editorMode])

  const renderedHtml = useCallback(() => {
    const html = marked.parse(notes) as string
    return { __html: DOMPurify.sanitize(html) }
  }, [notes])

  const insertTimestamp = useCallback(() => {
    const seconds = Math.max(0, Math.floor(getCurrentTime?.() ?? 0))
    return `[${formatTimestamp(seconds)}](#t=${seconds})`
  }, [getCurrentTime])

  const handlePreviewClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const link = target.closest('a')
    const href = link?.getAttribute('href') ?? ''
    const match = /^#t=(\d+)$/.exec(href)

    if (!match) {
      return
    }

    event.preventDefault()
    onSeekToTime?.(Number(match[1]))
  }, [onSeekToTime])

  const appendAnalysis = useCallback((generatedMarkdown: string) => {
    setNotes((current) => {
      const analysis = `## AI Analysis\n\n${generatedMarkdown.trim()}`
      return current.trim() ? `${current.trimEnd()}\n\n---\n\n${analysis}` : analysis
    })
    setActiveTab('notes')
  }, [])

  const replaceWithAnalysis = useCallback((generatedMarkdown: string) => {
    setNotes(generatedMarkdown.trim())
    setActiveTab('notes')
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#11161c] px-4 py-3">
        <div>
          <div role="tablist" aria-label="Video workspace" className="notes-workspace-tabs">
            <button type="button" role="tab" id="notes-tab" aria-selected={activeTab === 'notes'} aria-controls="notes-panel" className="notes-workspace-tab" onClick={() => setActiveTab('notes')}>Notes</button>
            <button type="button" role="tab" id="ai-tab" aria-selected={activeTab === 'ai'} aria-controls="ai-panel" className="notes-workspace-tab" onClick={() => setActiveTab('ai')}>AI Analysis</button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{activeTab === 'notes' ? 'Autosaved markdown' : 'Gemini video workspace'}</p>
        </div>
        {activeTab === 'notes' && <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-slate-500">Saving...</span>
          )}
          {!showPreview && (
            <div className="flex overflow-hidden rounded-md border border-white/10 bg-black/20">
              <button
                type="button"
                onClick={() => setEditorMode('source')}
                className={`border-r border-white/10 px-3 py-1.5 text-xs ${
                  editorMode === 'source' ? 'bg-blue-500/20 text-blue-100' : 'text-slate-400'
                }`}
              >
                Source
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('live-preview')}
                className={`px-3 py-1.5 text-xs ${
                  editorMode === 'live-preview' ? 'bg-blue-500/20 text-blue-100' : 'text-slate-400'
                }`}
              >
                Live Preview
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`rounded-md border px-3.5 py-1.5 text-xs ${
              showPreview
                ? 'border-blue-400/30 bg-blue-500/20 text-blue-100'
                : 'border-white/10 bg-white/[0.04] text-slate-300'
            }`}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>}
      </div>

      <div id="notes-panel" role="tabpanel" aria-labelledby="notes-tab" hidden={activeTab !== 'notes'} className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center p-4 text-sm text-slate-500">
            Loading notes...
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-300">
            {loadError}
          </div>
        ) : showPreview ? (
          <div
            className="markdown-preview scrollbar-thin h-full overflow-y-auto p-4"
            dangerouslySetInnerHTML={renderedHtml()}
            onClick={handlePreviewClick}
            style={{ lineHeight: 1.6 }}
          />
        ) : (
          <>
            {saveError && (
              <div className="border-b border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                {saveError}
              </div>
            )}
            <CodeMirrorMarkdownEditor
              value={notes}
              onChange={setNotes}
              livePreview={editorMode === 'live-preview'}
              placeholder="Write your notes here..."
              insertTimestamp={insertTimestamp}
            />
          </>
        )}
      </div>
      <div id="ai-panel" role="tabpanel" aria-labelledby="ai-tab" hidden={activeTab !== 'ai'} className="min-h-0 flex-1 overflow-hidden">
        <AIAnalysisPanel videoId={videoId} onAppendToNotes={appendAnalysis} onReplaceNotes={replaceWithAnalysis} />
      </div>
    </div>
  )
}
