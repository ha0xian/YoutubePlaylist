import type { Playlist } from '../types/playlist'

export interface YouTubeStatus {
  connected: boolean
  channelTitle: string | null
  channelId: string | null
}

export interface YouTubeAuthUrlResponse {
  authUrl: string
  state: string
}

export interface YouTubeCallbackRequest {
  code: string
  state: string
}

export interface YouTubeCallbackResponse {
  connected: boolean
  importedPlaylistCount: number
  channelTitle: string | null
  channelId: string | null
}

export interface YouTubeRemotePlaylist {
  youtubePlaylistId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  description: string
  publishedAt: string | null
  videoCount: number
  isImported: boolean
  localPlaylistId: number | null
  source: 'url' | 'oauth' | null
}

export interface YouTubePlaylistImportResponse {
  importedPlaylistCount: number
  playlists: Playlist[]
}

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

export function getYouTubeStatus(token: string): Promise<YouTubeStatus> {
  return fetch(`${API_BASE_URL}/api/youtube/status/`, {
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<YouTubeStatus>(data))
}

export function getYouTubeAuthUrl(
  token: string,
): Promise<YouTubeAuthUrlResponse> {
  return fetch(`${API_BASE_URL}/api/youtube/auth-url/`, {
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<YouTubeAuthUrlResponse>(data))
}

export function completeYouTubeOAuth(
  token: string,
  payload: YouTubeCallbackRequest,
): Promise<YouTubeCallbackResponse> {
  return fetch(`${API_BASE_URL}/api/youtube/callback/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      code: payload.code,
      state: payload.state,
    }),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<YouTubeCallbackResponse>(data))
}

export function listYouTubePlaylists(
  token: string,
): Promise<YouTubeRemotePlaylist[]> {
  return fetch(`${API_BASE_URL}/api/youtube/playlists/`, {
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<YouTubeRemotePlaylist[]>(data))
}

export function importYouTubePlaylists(
  token: string,
  playlistIds: string[],
): Promise<YouTubePlaylistImportResponse> {
  return fetch(`${API_BASE_URL}/api/youtube/playlists/import/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ playlist_ids: playlistIds }),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<YouTubePlaylistImportResponse>(data))
}

export function disconnectYouTube(
  token: string,
): Promise<{ connected: false; removedPlaylistCount: number }> {
  return fetch(`${API_BASE_URL}/api/youtube/disconnect/`, {
    method: 'POST',
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then(
      (data) =>
        normalizeKeys<{ connected: false; removedPlaylistCount: number }>(data),
    )
}
