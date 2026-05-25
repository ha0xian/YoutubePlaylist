import { useState, useEffect, useCallback } from 'react'
import { marked } from 'marked'

const STORAGE_KEY = 'youtube-notes'

export default function MarkdownNotes() {
  const [notes, setNotes] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, notes)
  }, [notes])

  const renderedHtml = useCallback(() => {
    return { __html: marked.parse(notes) as string }
  }, [notes])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Notes (Markdown)</h2>
        <button
          onClick={() => setShowPreview((p) => !p)}
          style={{
            padding: '6px 14px',
            border: '1px solid #444',
            borderRadius: 6,
            background: showPreview ? '#2a5a9a' : '#2a2a2a',
            color: '#e0e0e0',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {showPreview ? (
          <div
            className="markdown-preview"
            dangerouslySetInnerHTML={renderedHtml()}
            style={{
              padding: '16px',
              height: '100%',
              overflowY: 'auto',
              lineHeight: 1.6,
            }}
          />
        ) : (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your notes here...&#10;&#10;Supports Markdown: **bold**, *italic*, `code`, # headings, - lists"
            style={{
              width: '100%',
              height: '100%',
              padding: 16,
              border: 'none',
              resize: 'none',
              background: '#1a1a1a',
              color: '#e0e0e0',
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              outline: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
