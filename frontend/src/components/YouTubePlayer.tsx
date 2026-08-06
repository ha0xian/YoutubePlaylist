import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

const STORAGE_KEY = 'youtube-video-id'

interface YouTubePlayerApi {
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  loadVideoById: (videoId: string) => void
  destroy: () => void
}

interface YouTubeIframeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      width?: string
      height?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: () => void
      }
    },
  ) => YouTubePlayerApi
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<YouTubeIframeApi> | null = null

function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousReady = window.onYouTubeIframeAPIReady

      window.onYouTubeIframeAPIReady = () => {
        previousReady?.()
        if (window.YT) {
          resolve(window.YT)
        }
      }

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        script.async = true
        document.body.appendChild(script)
      }
    })
  }

  return youtubeApiPromise
}

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

export interface YouTubePlayerHandle {
  getCurrentTime: () => number | null
  seekTo: (seconds: number) => void
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  { initialVideoId },
  ref,
) {
  const [videoId, setVideoId] = useState(
    () => initialVideoId || localStorage.getItem(STORAGE_KEY) || ''
  )
  const [inputValue, setInputValue] = useState(videoId)
  const playerHostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YouTubePlayerApi | null>(null)

  const handleLoad = useCallback(() => {
    const id = extractVideoId(inputValue)
    if (id) {
      setVideoId(id)
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [inputValue])

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      try {
        return playerRef.current?.getCurrentTime() ?? null
      } catch {
        return null
      }
    },
    seekTo: (seconds: number) => {
      playerRef.current?.seekTo(seconds, true)
    },
  }), [])

  useEffect(() => {
    if (!videoId || !playerHostRef.current) {
      return undefined
    }

    let isActive = true

    loadYouTubeIframeApi().then((YT) => {
      if (!isActive || !playerHostRef.current) {
        return
      }

      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId)
        return
      }

      playerRef.current = new YT.Player(playerHostRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
        },
      })
    })

    return () => {
      isActive = false
    }
  }, [videoId])

  useEffect(() => () => {
    playerRef.current?.destroy()
    playerRef.current = null
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 gap-2 border-b border-white/10 bg-[#11161c] px-4 py-3">
        <input
          type="text"
          placeholder="Paste YouTube URL or video ID..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          className="control flex-1 rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={handleLoad}
          className="btn-primary rounded-md px-5 py-2 text-sm font-semibold whitespace-nowrap"
        >
          Load
        </button>
      </div>

      <div className="flex-1 bg-black">
        {videoId ? (
          <div ref={playerHostRef} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-base text-slate-600">
            Enter a YouTube URL above to start watching
          </div>
        )}
      </div>
    </div>
  )
})

export default YouTubePlayer
