import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { sendOAuthCode } from '../api/playlist'

export default function YouTubeCallbackHandler() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const code = searchParams.get('code')

    // Defer setState to avoid sync setState-in-effect lint warning
    // while keeping early-return guards.
    const run = async () => {
      if (!code) {
        setError('No authorization code received from Google.')
        return
      }

      if (!token) {
        setError('Not authenticated.')
        return
      }

      const t: string = token
      const c: string = code

      // Security: do NOT render the auth code in the DOM, do NOT log it.
      try {
        await sendOAuthCode(t, c)

        // Remove the ?code= parameter from the URL to prevent accidental
        // sharing via copy-paste (security finding #2).
        window.history.replaceState({}, document.title, '/')

        navigate('/', { replace: true })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to link YouTube account.',
        )
      }
    }

    run()
  }, [token, navigate, searchParams])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-2">YouTube Link Failed</h2>
          <p className="text-sm text-[#ff6b6b]">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="rounded-md border border-[#444] bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-[#e0e0e0] transition-colors hover:border-[#666] hover:bg-[#2a2a2a] cursor-pointer"
        >
          Back to Playlists
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-[#999]">
        <span className="inline-block w-5 h-5 border-2 border-[#666] border-t-white rounded-full animate-spin" />
        Linking YouTube account...
      </div>
    </div>
  )
}
