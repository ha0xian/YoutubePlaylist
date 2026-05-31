import { useState, useCallback } from 'react'

interface PlaylistUrlInputProps {
  onLink: (url: string) => Promise<void>
  isLoading: boolean
}

const YOUTUBE_PLAYLIST_PATTERN =
  /(youtube\.com\/playlist\?list=|youtu\.be\/)/i

export default function PlaylistUrlInput({ onLink, isLoading }: PlaylistUrlInputProps) {
  const [url, setUrl] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateUrl = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setValidationError(null)
      return false
    }
    if (!YOUTUBE_PLAYLIST_PATTERN.test(value.trim())) {
      setValidationError(
        `"${value.trim()}" does not appear to be a valid YouTube playlist URL. ` +
        'Expected format: https://www.youtube.com/playlist?list=... or https://youtu.be/...'
      )
      return false
    }
    setValidationError(null)
    return true
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!validateUrl(trimmed)) return

    try {
      await onLink(trimmed)
      setUrl('')
      setValidationError(null)
    } catch {
      // Error is handled by parent
    }
  }, [url, onLink, validateUrl])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setUrl(value)
      if (validationError && value.trim()) {
        validateUrl(value)
      } else if (!value.trim()) {
        setValidationError(null)
      }
    },
    [validationError, validateUrl],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Paste a YouTube playlist URL..."
          disabled={isLoading}
          className="flex-1 px-3 py-2.5 border border-[#444] rounded-md bg-[#2a2a2a] text-[#e0e0e0] text-sm outline-none focus:border-[#6cb6ff] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !url.trim()}
          className="px-5 py-2.5 border-none rounded-md bg-[#cc0000] text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-opacity"
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-[#ff6666] border-t-white rounded-full animate-spin" />
          ) : (
            'Import'
          )}
        </button>
      </div>
      {validationError && (
        <p className="mt-1.5 text-xs text-[#ff6b6b]" role="alert">
          {validationError}
        </p>
      )}
    </div>
  )
}
