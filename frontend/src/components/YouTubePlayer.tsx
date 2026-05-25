import { useState, useCallback } from 'react'

const STORAGE_KEY = 'youtube-video-id'

function extractVideoId(url: string): string | null {
  const trimmed = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  try {
    const u = new URL(trimmed)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    const v = u.searchParams.get('v')
    if (v) return v
  } catch {
    // not a valid URL
  }

  // try to extract from youtu.be
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // try to extract v= param from raw string
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (vMatch) return vMatch[1]

  return null
}

export default function YouTubePlayer() {
  const [videoId, setVideoId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [inputValue, setInputValue] = useState(videoId)

  const handleLoad = useCallback(() => {
    const id = extractVideoId(inputValue)
    if (id) {
      setVideoId(id)
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [inputValue])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="Paste YouTube URL or video ID..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #444',
            borderRadius: 6,
            background: '#2a2a2a',
            color: '#e0e0e0',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={handleLoad}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 6,
            background: '#cc0000',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Load
        </button>
      </div>

      <div style={{ flex: 1, background: '#000' }}>
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666',
            fontSize: 16,
          }}>
            Enter a YouTube URL above to start watching
          </div>
        )}
      </div>
    </div>
  )
}
