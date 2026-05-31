import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getYouTubeAuthUrl,
  sendOAuthCode,
  disconnectYouTube,
  getYouTubeStatus,
  getPlaylists,
  getHiddenPlaylists,
  getPlaylistById,
  linkPlaylistByUrl,
  hidePlaylist,
  unlinkPlaylist,
  showPlaylist,
  getVideoNote,
  saveVideoNote,
} from '../playlist'

const TOKEN = 'test-token-123'

// Snake-case mock data matching backend serializer output
const mockPlaylistRaw = {
  id: 1,
  youtube_playlist_id: 'PL_test',
  title: 'Test Playlist',
  channel_title: 'Test Channel',
  thumbnail_url: 'https://example.com/thumb.jpg',
  video_count: 5,
  description: 'A test playlist',
  published_at: '2026-01-01T00:00:00Z',
  source_type: 'url' as const,
  is_hidden: false,
  is_unlinked: false,
  created_at: '2026-01-01T00:00:00Z',
}

const mockVideoNoteRaw = {
  video_id: 42,
  body_markdown: '# My note',
  updated_at: '2026-05-01T12:00:00Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('getYouTubeAuthUrl', () => {
  it('returns the auth URL from the backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ auth_url: 'https://accounts.google.com/o/oauth2/auth?state=xyz' }),
      text: async () => JSON.stringify({ auth_url: 'https://accounts.google.com/o/oauth2/auth?state=xyz' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getYouTubeAuthUrl(TOKEN)
    expect(result.auth_url).toContain('accounts.google.com')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Bad request' }),
      text: async () => JSON.stringify({ detail: 'Bad request' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    await expect(getYouTubeAuthUrl(TOKEN)).rejects.toThrow('Bad request')
  })
})

describe('sendOAuthCode', () => {
  it('sends the code and returns transformed playlists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ playlists: [mockPlaylistRaw], count: 1 }),
      text: async () => JSON.stringify({ playlists: [mockPlaylistRaw], count: 1 }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await sendOAuthCode(TOKEN, 'auth-code-abc')
    expect(result.playlists).toHaveLength(1)
    expect(result.playlists[0].title).toBe('Test Playlist')
    expect(result.playlists[0].sourceType).toBe('url')
    expect(result.count).toBe(1)
  })
})

describe('getYouTubeStatus', () => {
  it('returns connection status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ connected: true }),
      text: async () => JSON.stringify({ connected: true }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getYouTubeStatus(TOKEN)
    expect(result.connected).toBe(true)
  })
})

describe('disconnectYouTube', () => {
  it('sends a POST and resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => null,
      text: async () => '',
      headers: new Headers({}),
    } as Response)

    await expect(disconnectYouTube(TOKEN)).resolves.toBeUndefined()
  })
})

describe('getPlaylists', () => {
  it('returns transformed playlists from backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockPlaylistRaw],
      text: async () => JSON.stringify([mockPlaylistRaw]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getPlaylists(TOKEN)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Test Playlist')
    expect(result[0].sourceType).toBe('url')
    expect(result[0].youtubePlaylistId).toBe('PL_test')
  })
})

describe('getHiddenPlaylists', () => {
  it('returns transformed hidden playlists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ ...mockPlaylistRaw, is_hidden: true }],
      text: async () => JSON.stringify([{ ...mockPlaylistRaw, is_hidden: true }]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getHiddenPlaylists(TOKEN)
    expect(result[0].isHidden).toBe(true)
  })
})

describe('getPlaylistById', () => {
  it('returns a transformed single playlist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockPlaylistRaw, videos: [] }),
      text: async () => JSON.stringify({ ...mockPlaylistRaw, videos: [] }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getPlaylistById(TOKEN, 1)
    expect(result.id).toBe(1)
    expect(result.videos).toEqual([])
  })
})

describe('linkPlaylistByUrl', () => {
  it('sends a URL and returns a transformed playlist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPlaylistRaw,
      text: async () => JSON.stringify(mockPlaylistRaw),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await linkPlaylistByUrl(TOKEN, 'https://www.youtube.com/playlist?list=PL_test')
    expect(result.title).toBe('Test Playlist')
  })

  it('throws for invalid URLs', async () => {
    await expect(linkPlaylistByUrl(TOKEN, 'not-a-url')).rejects.toThrow(
      'Invalid YouTube playlist URL',
    )
  })
})

describe('hidePlaylist', () => {
  it('sends a POST and resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => null,
      text: async () => '',
      headers: new Headers({}),
    } as Response)

    await expect(hidePlaylist(TOKEN, 1)).resolves.toBeUndefined()
  })
})

describe('unlinkPlaylist', () => {
  it('sends a POST and resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => null,
      text: async () => '',
      headers: new Headers({}),
    } as Response)

    await expect(unlinkPlaylist(TOKEN, 1)).resolves.toBeUndefined()
  })
})

describe('showPlaylist', () => {
  it('sends a POST and resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => null,
      text: async () => '',
      headers: new Headers({}),
    } as Response)

    await expect(showPlaylist(TOKEN, 1)).resolves.toBeUndefined()
  })
})

describe('getVideoNote', () => {
  it('returns a transformed video note', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVideoNoteRaw,
      text: async () => JSON.stringify(mockVideoNoteRaw),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getVideoNote(TOKEN, 42)
    expect(result.bodyMarkdown).toBe('# My note')
    expect(result.videoId).toBe(42)
  })
})

describe('saveVideoNote', () => {
  it('sends body_markdown and returns the saved transformed note', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVideoNoteRaw,
      text: async () => JSON.stringify(mockVideoNoteRaw),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await saveVideoNote(TOKEN, 42, '# My note')
    expect(result.updatedAt).toBe('2026-05-01T12:00:00Z')
  })
})
