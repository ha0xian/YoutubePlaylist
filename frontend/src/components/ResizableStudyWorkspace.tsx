import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react'
import { clampPaneRatio, DEFAULT_VIDEO_RATIO, getPaneBounds, paneRatioFromPointer, parseStoredPaneRatio, SEPARATOR_WIDTH } from '../lib/studyLayout'

interface ResizableStudyWorkspaceProps {
  queue?: ReactNode
  video: ReactNode
  notes: ReactNode
  storageKey: 'yt-study:playlist-pane-ratio' | 'yt-study:watch-pane-ratio'
}

export default function ResizableStudyWorkspace({ queue, video, notes, storageKey }: ResizableStudyWorkspaceProps) {
  const id = useId()
  const splitRef = useRef<HTMLDivElement>(null)
  const separatorRef = useRef<HTMLDivElement>(null)
  const queueToggleRef = useRef<HTMLButtonElement>(null)
  const [queueExpanded, setQueueExpanded] = useState(() => window.matchMedia('(min-width: 960px)').matches)
  const [ratio, setRatio] = useState(() => {
    try { return parseStoredPaneRatio(window.localStorage.getItem(storageKey)) } catch { return DEFAULT_VIDEO_RATIO }
  })
  const preferredRef = useRef(ratio)
  const displayedRef = useRef(ratio)
  const dragRef = useRef<{ pointerId: number; offset: number } | null>(null)
  const frameRef = useRef<number | null>(null)
  const [geometry, setGeometry] = useState({ width: 0, wide: false })
  const bounds = geometry.wide ? getPaneBounds(geometry.width) : null
  const displayRatio = bounds ? clampPaneRatio(ratio, bounds) : ratio

  function paint(value: number) {
    displayedRef.current = value
    splitRef.current?.style.setProperty('--video-ratio', String(value))
    splitRef.current?.parentElement?.style.setProperty('--video-ratio', String(value))
    separatorRef.current?.setAttribute('aria-valuenow', String(Math.round(value * 100)))
  }

  function commit(value: number) {
    preferredRef.current = value
    paint(value)
    setRatio(value)
    try { window.localStorage.setItem(storageKey, String(value)) } catch { /* Resizing still works without persistence. */ }
  }

  function finishDrag() {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    splitRef.current?.removeAttribute('data-dragging')
    commit(displayedRef.current)
    if (separatorRef.current?.hasPointerCapture(drag.pointerId)) separatorRef.current.releasePointerCapture(drag.pointerId)
  }

  useEffect(() => {
    const split = splitRef.current
    if (!split) return
    const handle = separatorRef.current
    const media = window.matchMedia('(min-width: 960px)')
    let lastWidth = -1
    let lastWide = !media.matches
    const measure = () => {
      const width = split.getBoundingClientRect().width - SEPARATOR_WIDTH
      if (width === lastWidth && media.matches === lastWide) return
      lastWidth = width
      lastWide = media.matches
      const currentBounds = media.matches ? getPaneBounds(width) : null
      // A temporary viewport constraint must not replace the saved preference.
      const value = currentBounds ? clampPaneRatio(preferredRef.current, currentBounds) : preferredRef.current
      paint(value)
      setGeometry({ width, wide: media.matches })
      if (dragRef.current) {
        const pointerId = dragRef.current.pointerId
        dragRef.current = null
        split.removeAttribute('data-dragging')
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
        frameRef.current = null
        if (separatorRef.current?.hasPointerCapture(pointerId)) separatorRef.current.releasePointerCapture(pointerId)
      }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(split)
    media.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      media.removeEventListener('change', measure)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      const pointerId = dragRef.current?.pointerId
      dragRef.current = null
      if (pointerId !== undefined && handle?.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
      split.removeAttribute('data-dragging')
    }
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!bounds) return
    const step = event.shiftKey ? 0.1 : 0.02
    let next: number
    switch (event.key) {
      case 'ArrowLeft': next = displayRatio - step; break
      case 'ArrowRight': next = displayRatio + step; break
      case 'Home': next = bounds.min; break
      case 'End': next = bounds.max; break
      case 'Enter': next = DEFAULT_VIDEO_RATIO; break
      default: return
    }
    event.preventDefault()
    commit(clampPaneRatio(next, bounds))
  }

  return (
    <main className={`study-workspace ${queue ? 'has-queue' : ''}`} data-queue-expanded={queueExpanded}>
      <div ref={splitRef} className="study-split" data-split={Boolean(bounds)}>
        <section id={`${id}-video`} className="study-video">{video}<div className="iframe-shield" aria-hidden="true" /></section>
        <div ref={separatorRef} role="separator" tabIndex={bounds ? 0 : -1} hidden={!bounds}
          className="study-separator" aria-label="Resize video and notes" aria-orientation="vertical"
          aria-controls={`${id}-video ${id}-notes`} aria-valuenow={Math.round(displayRatio * 100)}
          aria-valuemin={bounds ? Math.round(bounds.min * 100) : undefined}
          aria-valuemax={bounds ? Math.round(bounds.max * 100) : undefined}
          onKeyDown={handleKeyDown}
          onDoubleClick={() => bounds && commit(clampPaneRatio(DEFAULT_VIDEO_RATIO, bounds))}
          onPointerDown={(event) => {
            if (!bounds || event.button !== 0 || dragRef.current) return
            event.preventDefault()
            event.currentTarget.focus()
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = { pointerId: event.pointerId, offset: event.clientX - event.currentTarget.getBoundingClientRect().left }
            splitRef.current?.setAttribute('data-dragging', 'true')
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            const split = splitRef.current
            if (!drag || !split || drag.pointerId !== event.pointerId) return
            const rect = split.getBoundingClientRect()
            const next = paneRatioFromPointer(event.clientX - drag.offset, rect.left, rect.width - SEPARATOR_WIDTH)
            displayedRef.current = next
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
            frameRef.current = requestAnimationFrame(() => { paint(next); frameRef.current = null })
          }}
          onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}
        ><span aria-hidden="true" /></div>
        <section id={`${id}-notes`} className="study-notes">{notes}</section>
      </div>
      {queue && (
        <aside className="study-queue" aria-label="Video queue" onKeyDown={(event) => {
          if (event.key === 'Escape' && queueExpanded) {
            event.preventDefault()
            setQueueExpanded(false)
            queueToggleRef.current?.focus()
          }
        }}>
          <button ref={queueToggleRef} type="button" className="study-queue-toggle btn-secondary"
            aria-expanded={queueExpanded} aria-controls={`${id}-queue`}
            aria-label={queueExpanded ? 'Collapse video queue' : 'Expand video queue'}
            onClick={() => setQueueExpanded((expanded) => !expanded)}>
            <span aria-hidden="true">{queueExpanded ? '›' : '‹'}</span>
            <span>{queueExpanded ? 'Collapse queue' : 'Queue'}</span>
          </button>
          <div id={`${id}-queue`} className="study-queue-content" hidden={!queueExpanded}>{queue}</div>
        </aside>
      )}
    </main>
  )
}
