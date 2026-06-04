import { useState, useEffect, useCallback } from 'react'
import { marked } from 'marked'

const FALLBACK_KEY = 'youtube-notes'

interface MarkdownNotesProps {
  videoId?: string
}

export default function MarkdownNotes({ videoId }: MarkdownNotesProps) {
  const storageKey = videoId ? `youtube-notes:${videoId}` : FALLBACK_KEY

  const [notes, setNotes] = useState(() => localStorage.getItem(storageKey) || '')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    localStorage.setItem(storageKey, notes)
  }, [storageKey, notes])

  const renderedHtml = useCallback(() => {
    return { __html: marked.parse(notes) as string }
  }, [notes])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#333] shrink-0">
        <h2 className="text-base font-semibold">Notes (Markdown)</h2>
        <button
          onClick={() => setShowPreview((p) => !p)}
          style={{ background: showPreview ? '#2a5a9a' : '#2a2a2a' }}
          className="py-1.5 px-3.5 border border-[#444] rounded-md text-[#e0e0e0] text-xs cursor-pointer"
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div
            className="markdown-preview p-4 h-full overflow-y-auto"
            dangerouslySetInnerHTML={renderedHtml()}
            style={{ lineHeight: 1.6 }}
          />
        ) : (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes here...&#10;&#10;Supports Markdown: **bold**, *italic*, `code`, # headings, - lists"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}
            className="w-full h-full p-4 border-none resize-none bg-[#1a1a1a] text-[#e0e0e0] text-sm outline-none"
          />
        )}
      </div>
    </div>
  )
}
