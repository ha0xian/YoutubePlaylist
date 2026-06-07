export interface Note {
  id: number | null
  youtubeVideoId: string
  content: string
  createdAt: string | null
  updatedAt: string | null
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

export function getNote(token: string, videoId: string): Promise<Note> {
  return fetch(`${API_BASE_URL}/api/notes/${encodeURIComponent(videoId)}/`, {
    headers: authHeaders(token),
  })
    .then(parseJson)
    .then((data) => normalizeKeys<Note>(data))
}

export function saveNote(
  token: string,
  videoId: string,
  content: string,
  signal?: AbortSignal,
): Promise<Note> {
  return fetch(`${API_BASE_URL}/api/notes/${encodeURIComponent(videoId)}/`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ content }),
    signal,
  })
    .then(parseJson)
    .then((data) => normalizeKeys<Note>(data))
}
