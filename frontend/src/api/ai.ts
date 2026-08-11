export interface AISettings {
  defaultPrompt: string
  createdAt: string | null
  updatedAt: string | null
}

export interface VideoAnalysisResult {
  videoId: string
  content: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

function normalize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(normalize) as T
  if (value === null || typeof value !== 'object') return value as T
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      normalize(item),
    ]),
  ) as T
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const detail = data?.detail
    const message = typeof detail === 'string'
      ? detail
      : Object.values(data ?? {}).flat().join(' ') || 'Request failed'
    throw new Error(message)
  }
  return normalize<T>(data)
}

const headers = (token: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Token ${token}`,
})

export function getAISettings(token: string): Promise<AISettings> {
  return fetch(`${API_BASE_URL}/api/ai/settings/`, { headers: headers(token) })
    .then(parseJson<AISettings>)
}

export function saveAISettings(token: string, defaultPrompt: string): Promise<AISettings> {
  return fetch(`${API_BASE_URL}/api/ai/settings/`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ default_prompt: defaultPrompt }),
  }).then(parseJson<AISettings>)
}

export function analyzeVideo(
  token: string,
  videoId: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<VideoAnalysisResult> {
  return fetch(`${API_BASE_URL}/api/videos/${encodeURIComponent(videoId)}/analyze/`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ prompt }),
    signal,
  }).then(parseJson<VideoAnalysisResult>)
}
