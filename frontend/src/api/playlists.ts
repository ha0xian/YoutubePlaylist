import type { Playlist, PlaylistDetail } from '../types/playlist'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function parseJson<T>(response: Response): Promise<T> {
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

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  }
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function normalizeKeys<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T
  if (Array.isArray(obj)) return obj.map(normalizeKeys) as T
  if (typeof obj !== 'object') return obj as T

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = normalizeKeys(value)
  }
  return result as T
}

export function listPlaylists(token: string): Promise<Playlist[]> {
  return fetch(`${API_BASE_URL}/api/playlists/`, {
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<Playlist[]>(data))
}

export function getPlaylist(
  token: string,
  id: string | number,
): Promise<PlaylistDetail> {
  return fetch(`${API_BASE_URL}/api/playlists/${id}/`, {
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<PlaylistDetail>(data))
}

export function refreshPlaylist(
  token: string,
  id: string | number,
): Promise<PlaylistDetail> {
  return fetch(`${API_BASE_URL}/api/playlists/${id}/refresh/`, {
    method: 'POST',
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<PlaylistDetail>(data))
}

export function importPlaylist(
  token: string,
  url: string,
): Promise<PlaylistDetail> {
  return fetch(`${API_BASE_URL}/api/playlists/import/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ url }),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<PlaylistDetail>(data))
}
