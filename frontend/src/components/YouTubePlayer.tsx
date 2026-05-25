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

interface YouTubePlayerProps {
  initialVideoId?: string
}

export default function YouTubePlayer({ initialVideoId }: YouTubePlayerProps) {
  const [videoId, setVideoId] = useState(
    () => initialVideoId || localStorage.getItem(STORAGE_KEY) || ''
  )
  const [inputValue, setInputValue] = useState(videoId)

  const handleLoad = useCallback(() => {
    const id = extractVideoId(inputValue)
    if (id) {
      setVideoId(id)
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [inputValue])

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-[#333] shrink-0">
        <input
          type="text"
          placeholder="Paste YouTube URL or video ID..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          className="flex-1 px-3 py-2 border border-[#444] rounded-md bg-[#2a2a2a] text-[#e0e0e0] text-sm outline-none"
        />
        <button
          onClick={handleLoad}
          className="px-5 py-2 border-none rounded-md bg-[#cc0000] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
        >
          Load
        </button>
      </div>

      <div className="flex-1 bg-black">
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-none"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#666] text-base">
            Enter a YouTube URL above to start watching
          </div>
        )}
      </div>
    </div>
  )
}
