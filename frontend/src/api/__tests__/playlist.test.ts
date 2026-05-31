import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getYouTubeAuthUrl,
  sendOAuthCode,
  disconnectYouTube,
  getPlaylists,
  getHiddenPlaylists,
  getPlaylistById,
  linkPlaylistByUrl,
  hidePlaylist,
  unlinkPlaylist,
  getVideoNote,
  saveVideoNote,
} from '../playlist'
import type { Playlist, VideoNote } from '../../types/playlist'

const TOKEN = 'test-token-123'

const mockPlaylist: Playlist = {
  id: 1,
  youtubePlaylistId: 'PL_test',
  title: 'Test Playlist',
  channelTitle: 'Test Channel',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  videoCount: 5,
  description: 'A test playlist',
  publishedAt: '2026-01-01T00:00:00Z',
  sourceType: 'url',
  isHidden: false,
  isUnlinked: false,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockVideoNote: VideoNote = {
  videoId: 42,
  bodyMarkdown: '# My note',
  updatedAt: '2026-05-01T12:00:00Z',
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
  it('sends the code and returns playlists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ playlists: [mockPlaylist], count: 1 }),
      text: async () => JSON.stringify({ playlists: [mockPlaylist], count: 1 }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await sendOAuthCode(TOKEN, 'auth-code-abc')
    expect(result.playlists).toHaveLength(1)
    expect(result.count).toBe(1)
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
  it('returns an array of playlists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockPlaylist],
      text: async () => JSON.stringify([mockPlaylist]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getPlaylists(TOKEN)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Test Playlist')
  })
})

describe('getHiddenPlaylists', () => {
  it('returns hidden playlists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ ...mockPlaylist, isHidden: true }],
      text: async () => JSON.stringify([{ ...mockPlaylist, isHidden: true }]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getHiddenPlaylists(TOKEN)
    expect(result[0].isHidden).toBe(true)
  })
})

describe('getPlaylistById', () => {
  it('returns a single playlist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPlaylist,
      text: async () => JSON.stringify(mockPlaylist),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getPlaylistById(TOKEN, 1)
    expect(result.id).toBe(1)
  })
})

describe('linkPlaylistByUrl', () => {
  it('sends a URL and returns a playlist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPlaylist,
      text: async () => JSON.stringify(mockPlaylist),
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
  it('sends a DELETE and resolves', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
      text: async () => '',
      headers: new Headers({}),
    } as Response)

    await expect(unlinkPlaylist(TOKEN, 1)).resolves.toBeUndefined()
  })
})

describe('getVideoNote', () => {
  it('returns a video note', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVideoNote,
      text: async () => JSON.stringify(mockVideoNote),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await getVideoNote(TOKEN, 42)
    expect(result.bodyMarkdown).toBe('# My note')
  })
})

describe('saveVideoNote', () => {
  it('sends body_markdown and returns the saved note', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockVideoNote,
      text: async () => JSON.stringify(mockVideoNote),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const result = await saveVideoNote(TOKEN, 42, '# My note')
    expect(result.updatedAt).toBe('2026-05-01T12:00:00Z')
  })
})
