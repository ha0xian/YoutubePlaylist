export interface AuthUser {
  id: number
  username: string
  email: string
}

export interface AuthCredentials {
  username: string
  password: string
}

export interface RegisterCredentials extends AuthCredentials {
  email: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function parseJson<T>(response: Response): Promise<T> {
  // 204/205 No Content — nothing to parse
  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      Object.values(data ?? {})
        .flat()
        .join(' ') ||
      'Request failed'

    throw new Error(message)
  }

  return data as T
}

export async function authFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
) {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Token ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  return parseJson<T>(response)
}

export function login(credentials: AuthCredentials) {
  return authFetch<AuthResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function register(credentials: RegisterCredentials) {
  return authFetch<AuthResponse>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function getCurrentUser(token: string) {
  return authFetch<AuthUser>(
    '/api/auth/me/',
    {
      method: 'GET',
    },
    token,
  )
}
