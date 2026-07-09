import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

interface AuthPageProps {
  mode: 'login' | 'register'
}

interface LocationState {
  from?: {
    pathname?: string
  }
}

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, login, register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegister = mode === 'register'
  const state = location.state as LocationState | null
  const destination = state?.from?.pathname ?? '/'

  if (!isLoading && isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isRegister) {
        await register({ username, email, password })
      } else {
        await login({ username, password })
      }

      navigate(destination, { replace: true })
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to complete authentication',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-app flex min-h-screen items-center justify-center px-6 py-10">
      <main className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden rounded-md border border-white/10 bg-[#101419]/80 p-8 lg:block">
          <div className="mb-10 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e11d24]">
              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">YT Study</p>
              <p className="text-xs text-slate-500">Playlist workspace</p>
            </div>
          </div>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-white">
            Build a focused library from the videos you already learn from.
          </h2>
          <div className="mt-8 grid gap-3">
            {['Import public playlists', 'Sync from YouTube', 'Take autosaved markdown notes'].map((item) => (
              <div key={item} className="surface-subtle rounded-md px-4 py-3 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-md justify-self-center lg:max-w-none">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
            {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isRegister
                ? 'Register to start building your private playlist workspace.'
                : 'Sign in to browse playlists, watch videos, and keep your notes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="surface space-y-4 rounded-md p-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="control mt-2 w-full rounded-md px-3 py-2 text-sm"
              />
            </label>

            {isRegister && (
              <label className="block">
                <span className="text-sm font-medium text-slate-300">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="control mt-2 w-full rounded-md px-3 py-2 text-sm"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-slate-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                className="control mt-2 w-full rounded-md px-3 py-2 text-sm"
              />
            </label>

            {error && (
              <div className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full rounded-md px-4 py-2.5 text-sm font-semibold">
              {isSubmitting
                ? isRegister
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link
              to={isRegister ? '/login' : '/register'}
              state={location.state}
              className="font-semibold text-blue-300 hover:text-white"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
