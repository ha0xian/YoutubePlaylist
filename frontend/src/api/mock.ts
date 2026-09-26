import type { PlaylistDetail, Video } from '../types/playlist'
import type { Note } from './notes'
import type { AISettings } from './ai'

const timestamp = '2026-01-01T12:00:00Z'
const video = (id: number, youtubeVideoId: string, title: string): Video => ({
  id, youtubeVideoId, title, position: id, channelTitle: 'Study collection',
  duration: '12:30', thumbnailUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
  publishedAt: timestamp, viewCount: 12500, isRemoved: false,
})
const samples = [
  video(1, 'W6NZfCO5SIk', 'JavaScript fundamentals'),
  video(2, 'Tn6-PIqc4UM', 'React in 100 seconds'),
  video(3, 'zQnBQ4tB3ZA', 'TypeScript in 100 seconds'),
]
const playlist = (id: number, title: string, videos: Video[], source = 'url'): PlaylistDetail => ({
  id, title, videos, source, youtubePlaylistId: `mock-playlist-${id}`,
  channelTitle: 'Local demo', thumbnailUrl: videos[0]?.thumbnailUrl ?? '',
  videoCount: videos.length, description: 'Sample data for local development.',
  publishedAt: timestamp, isUnlinked: false,
})

// Kept in memory: reload the page to restore fixtures. Never writes real account storage.
const playlists = [
  playlist(1, 'Web development essentials', samples),
  playlist(2, 'Quick study sessions', samples.slice(1)),
  playlist(3, 'Personal playlist', samples.slice(0, 1), 'personal'),
]
const notes = new Map<string, Note>([[samples[0].youtubeVideoId, {
  id: 1, youtubeVideoId: samples[0].youtubeVideoId,
  content: '# JavaScript study notes\n\nThese are editable mock notes.\n\n## Key ideas\n\n- Variables store values.\n- Functions make behavior reusable.\n- Practice with a small project.\n\n## Next steps\n\n- [ ] Review the examples\n- [ ] Write a practice function\n',
  createdAt: timestamp, updatedAt: timestamp,
}]])
let settings: AISettings = { defaultPrompt: 'Summarize the key ideas and suggest practice exercises.', createdAt: timestamp, updatedAt: timestamp }

const json = (data: unknown, status = 200) => Response.json(data, { status })
const error = (detail: string, status = 400) => json({ detail }, status)

export async function mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
  options.signal?.throwIfAborted()
  const path = new URL(url, 'http://localhost').pathname
  const method = options.method ?? 'GET'
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : {}

  if (path === '/api/playlists/' && method === 'GET') {
    return json(playlists.filter((item) => !item.isUnlinked))
  }
  const match = path.match(/^\/api\/playlists\/(\d+)\/(refresh\/|unlink\/)?$/)
  if (match) {
    const item = playlists.find((entry) => entry.id === Number(match[1]))
    if (!item) return error('Playlist not found.', 404)
    if (method === 'POST' && match[2] === 'unlink/') {
      if (item.source === 'personal') return error('The personal playlist cannot be unlinked.')
      item.isUnlinked = true
      return json({ id: item.id, isUnlinked: true, detail: 'Mock playlist unlinked.' })
    }
    if ((method === 'GET' && !match[2]) || (method === 'POST' && match[2] === 'refresh/')) return json(item)
  }
  if (method === 'POST' && (path === '/api/playlists/import/' || path === '/api/playlists/personal/videos/import/')) {
    let parsed: URL
    try { parsed = new URL(body.url) } catch { return error('Enter a valid YouTube URL.') }
    if (!['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com'].includes(parsed.hostname)
      || !['http:', 'https:'].includes(parsed.protocol)) return error('Enter a valid YouTube URL.')
    if (path === '/api/playlists/import/') {
      const remoteId = parsed.searchParams.get('list')
      if (!remoteId) return error('The URL must contain a playlist ID.')
      const existing = playlists.find((item) => item.youtubePlaylistId === remoteId)
      if (existing) { existing.isUnlinked = false; return json(existing) }
      const item = playlist(playlists.length + 1, 'Imported playlist (mock)', structuredClone(samples))
      item.youtubePlaylistId = remoteId
      playlists.push(item)
      return json(item)
    }
    const videoId = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v')
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) return error('Enter a valid YouTube video URL.')
    const personal = playlists.find((item) => item.source === 'personal')!
    if (!personal.videos.some((item) => item.youtubeVideoId === videoId)) {
      personal.videos.push(video(personal.videos.length + 1, videoId, 'Imported video (mock)'))
      personal.videoCount = personal.videos.length
    }
    return json(personal)
  }
  const noteMatch = path.match(/^\/api\/notes\/([^/]+)\/$/)
  if (noteMatch && (method === 'GET' || method === 'PUT')) {
    const videoId = decodeURIComponent(noteMatch[1])
    const current = notes.get(videoId) ?? { id: null, youtubeVideoId: videoId, content: '', createdAt: null, updatedAt: null }
    if (method === 'GET') return json(current)
    if (typeof body.content !== 'string') return error('Content must be text.')
    const now = new Date().toISOString()
    const saved = { ...current, id: current.id ?? notes.size + 1, content: body.content, createdAt: current.createdAt ?? now, updatedAt: now }
    notes.set(videoId, saved)
    return json(saved)
  }
  if (path === '/api/ai/settings/') {
    if (method === 'GET') return json(settings)
    if (method === 'PUT') {
      if (typeof body.default_prompt !== 'string') return error('Prompt must be text.')
      settings = { ...settings, defaultPrompt: body.default_prompt, updatedAt: new Date().toISOString() }
      return json(settings)
    }
  }
  const analysis = path.match(/^\/api\/videos\/([^/]+)\/analyze\/$/)
  if (analysis && method === 'POST') {
    return json({ videoId: decodeURIComponent(analysis[1]), content: '## Mock AI analysis\n\nThis is sample output for local development; no AI service was called.\n\n### Key ideas\n\n- Break a concept into small steps.\n- Try each example yourself.\n- Record questions in your notes.\n\n### Practice\n\nBuild a small example and explain how it works.' })
  }
  if (path === '/api/youtube/status/' && method === 'GET') return json({ connected: false, channelTitle: null, channelId: null })
  if (path.startsWith('/api/youtube/')) return error('YouTube account connections are unavailable in mock mode. Set VITE_USE_MOCK_DATA=false to use the real backend.')
  // Never fall through to the network for unsupported mock requests.
  return error('This request is unavailable in local mock mode.', 404)
}
