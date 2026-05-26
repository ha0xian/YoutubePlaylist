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
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-6 py-10">
      <main className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-[#999]">
            {isRegister
              ? 'Register to start building your private playlist workspace.'
              : 'Sign in to browse playlists, watch videos, and keep your notes.'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[#333] bg-[#1a1a1a] p-5 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium text-[#e0e0e0]">Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              className="mt-2 w-full rounded-md border border-[#444] bg-[#2a2a2a] px-3 py-2 text-sm text-white outline-none focus:border-[#cc0000]"
            />
          </label>

          {isRegister && (
            <label className="block">
              <span className="text-sm font-medium text-[#e0e0e0]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-2 w-full rounded-md border border-[#444] bg-[#2a2a2a] px-3 py-2 text-sm text-white outline-none focus:border-[#cc0000]"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-[#e0e0e0]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              className="mt-2 w-full rounded-md border border-[#444] bg-[#2a2a2a] px-3 py-2 text-sm text-white outline-none focus:border-[#cc0000]"
            />
          </label>

          {error && (
            <div className="rounded-md border border-[#7f1d1d] bg-[#2a1111] px-3 py-2 text-sm text-[#ffb4b4]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md border-none bg-[#cc0000] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e00000] disabled:cursor-not-allowed disabled:bg-[#661111] cursor-pointer"
          >
            {isSubmitting
              ? isRegister
                ? 'Creating account...'
                : 'Signing in...'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#999]">
          {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
          <Link
            to={isRegister ? '/login' : '/register'}
            state={location.state}
            className="font-semibold text-[#6cb6ff] hover:text-white"
          >
            {isRegister ? 'Sign in' : 'Register'}
          </Link>
        </p>
      </main>
    </div>
  )
}
