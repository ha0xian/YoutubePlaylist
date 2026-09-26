import { USE_MOCK_DATA } from './environment'

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (import.meta.env.DEV && USE_MOCK_DATA) {
    const { mockFetch } = await import('./mock')
    return mockFetch(url, options)
  }
  return fetch(url, options)
}
