import { useState, useEffect, useCallback, useRef } from 'react'
import { marked } from 'marked'
import { useAuth } from '../auth/useAuth'
import { getVideoNote, saveVideoNote } from '../api/playlist'

interface MarkdownNotesProps {
  videoId: number
}

export default function MarkdownNotes({ videoId }: MarkdownNotesProps) {
  const { token } = useAuth()
  const [notes, setNotes] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load note from backend on mount and when videoId changes
  useEffect(() => {
    if (!token || !videoId) {
      Promise.resolve().then(() => setIsLoading(false))
      return
    }

    const t: string = token
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const note = await getVideoNote(t, videoId)
        if (!cancelled) {
          setNotes(note.bodyMarkdown ?? '')
          setSaveStatus('saved')
        }
      } catch {
        if (!cancelled) {
          setNotes('')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token, videoId])

  // Auto-save with debounce
  const triggerSave = useCallback(
    async (content: string) => {
      if (!token || !videoId) return
      const t: string = token
      try {
        await saveVideoNote(t, videoId, content)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      } finally {
        setIsSaving(false)
      }
    },
    [token, videoId],
  )

  // Debounced save: save 1.5 seconds after the user stops typing
  useEffect(() => {
    if (saveStatus === 'saved') return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      setIsSaving(true)
      triggerSave(notes)
    }, 1500)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, saveStatus])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value)
      setSaveStatus('unsaved')
    },
    [],
  )

  // Obsidian-style: when Enter is pressed, apply markdown rendering to the current line
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        const textarea = e.currentTarget
        const cursorPos = textarea.selectionStart
        const text = textarea.value
        const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1
        const currentLine = text.slice(lineStart, cursorPos)

        // Check if the line starts with a markdown heading prefix
        const headingMatch = currentLine.match(/^(#{1,6})\s/)
        if (headingMatch) {
          e.preventDefault()
          // Add a newline and render the heading in preview
          const newText =
            text.slice(0, cursorPos) + '\n' + text.slice(cursorPos)
          setNotes(newText)
          setSaveStatus('unsaved')

          // Move cursor to the new line
          requestAnimationFrame(() => {
            textarea.selectionStart = cursorPos + 1
            textarea.selectionEnd = cursorPos + 1
          })
        }
      }
    },
    [],
  )

  const renderedHtml = useCallback(() => {
    return { __html: marked.parse(notes) as string }
  }, [notes])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#333] shrink-0">
          <h2 className="text-base font-semibold">Notes (Markdown)</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-[#666]">
          Loading notes...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-[#333] shrink-0">
        <h2 className="text-base font-semibold">Notes (Markdown)</h2>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-[#999]">Saving...</span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-xs text-[#ffaa33]">Unsaved</span>
          )}
          {saveStatus === 'saved' && !isSaving && (
            <span className="text-xs text-[#6cb6ff]">Saved</span>
          )}
          <button
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
          <textarea
            value={notes}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write your notes here...&#10;&#10;Supports Markdown: **bold**, *italic*, `code`, # headings, - lists&#10;Press Enter after a # heading to render it."
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}
            className="w-full h-full p-4 border-none resize-none bg-[#1a1a1a] text-[#e0e0e0] text-sm outline-none"
          />
        )}
      </div>
    </div>
  )
}
