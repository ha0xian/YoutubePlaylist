import { useState, useEffect, useCallback } from 'react'
import { marked } from 'marked'
import CodeMirrorMarkdownEditor from './CodeMirrorMarkdownEditor'

const FALLBACK_KEY = 'youtube-notes'
const EDITOR_MODE_KEY = 'youtube-notes:editor-mode'

type MarkdownEditorMode = 'source' | 'live-preview'

interface MarkdownNotesProps {
  videoId?: string
}

function readEditorMode(): MarkdownEditorMode {
  return localStorage.getItem(EDITOR_MODE_KEY) === 'source' ? 'source' : 'live-preview'
}

export default function MarkdownNotes({ videoId }: MarkdownNotesProps) {
  const storageKey = videoId ? `youtube-notes:${videoId}` : FALLBACK_KEY

  const [notes, setNotes] = useState(() => localStorage.getItem(storageKey) || '')
  const [showPreview, setShowPreview] = useState(false)
  const [editorMode, setEditorMode] = useState<MarkdownEditorMode>(readEditorMode)

  useEffect(() => {
    localStorage.setItem(storageKey, notes)
  }, [storageKey, notes])

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
        {showPreview ? (
          <div
            className="markdown-preview p-4 h-full overflow-y-auto"
            dangerouslySetInnerHTML={renderedHtml()}
            style={{ lineHeight: 1.6 }}
          />
        ) : (
          <CodeMirrorMarkdownEditor
            value={notes}
            onChange={setNotes}
            livePreview={editorMode === 'live-preview'}
            placeholder="Write your notes here..."
          />
        )}
      </div>
    </div>
  )
}
