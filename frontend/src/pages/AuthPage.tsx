import ThemeSelect from '../components/ThemeSelect'
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
        <section className="hidden rounded-lg border border-line bg-panel p-8 lg:block">
          <div className="mb-10 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-main">YT Study</p>
              <p className="text-xs text-muted">Playlist workspace</p>
            </div>
          </div>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-main">
            Build a focused library from the videos you already learn from.
          </h2>
          <div className="mt-8 grid gap-3">
            {['Import public playlists', 'Sync from YouTube', 'Take autosaved markdown notes'].map((item) => (
              <div key={item} className="surface-subtle rounded-lg px-4 py-3 text-sm text-main">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-md justify-self-center lg:max-w-none">
          <div className="mb-8">
            <div className="mb-5 flex justify-end"><ThemeSelect /></div>
            <h1 className="text-3xl font-semibold tracking-tight text-main">
            {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isRegister
                ? 'Register to start building your private playlist workspace.'
                : 'Sign in with your username or email to browse playlists, watch videos, and keep your notes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="surface space-y-4 rounded-lg p-5">
            <label className="block">
              <span className="text-sm font-medium text-main">
                {isRegister ? 'Username' : 'Username or email'}
              </span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                placeholder={isRegister ? 'northwhite' : 'northwhite or you@example.com'}
                className="control mt-2 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            {isRegister && (
              <label className="block">
                <span className="text-sm font-medium text-main">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="control mt-2 w-full rounded-lg px-3 py-2 text-sm"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-medium text-main">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                className="control mt-2 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full rounded-lg px-4 py-2.5 text-sm font-semibold">
              {isSubmitting
                ? isRegister
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
            <Link
              to={isRegister ? '/login' : '/register'}
              state={location.state}
              className="font-semibold text-accent hover:text-main"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
