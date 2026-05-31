import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePlaylists } from '../usePlaylists'
import { useAuth } from '../../auth/useAuth'
import type { Playlist } from '../../types/playlist'

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

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

const mockedUseAuth = vi.mocked(useAuth)
const defaultAuth = { token: 'test-token-123', user: null, isLoading: false, isAuthenticated: true, login: vi.fn(), register: vi.fn(), logout: vi.fn() }

beforeEach(() => {
  vi.restoreAllMocks()
  mockedUseAuth.mockReturnValue(defaultAuth)
})

describe('usePlaylists', () => {
  it('fetches playlists on mount and returns them', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockPlaylist],
      text: async () => JSON.stringify([mockPlaylist]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const { result } = renderHook(() => usePlaylists())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.playlists).toHaveLength(1)
    expect(result.current.playlists[0].title).toBe('Test Playlist')
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
      text: async () => JSON.stringify({ detail: 'Server error' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const { result } = renderHook(() => usePlaylists())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.playlists).toEqual([])
    expect(result.current.error).toBe('Server error')
  })

  it('sets error when not authenticated', async () => {
    mockedUseAuth.mockReturnValue({ token: null, user: null, isLoading: false, isAuthenticated: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() })

    const { result } = renderHook(() => usePlaylists())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Not authenticated')
  })

  it('refresh re-fetches playlists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockPlaylist],
      text: async () => JSON.stringify([mockPlaylist]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    const { result } = renderHook(() => usePlaylists())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ ...mockPlaylist, id: 2, title: 'Refreshed Playlist' }],
      text: async () => JSON.stringify([{ ...mockPlaylist, id: 2, title: 'Refreshed Playlist' }]),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as Response)

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.playlists[0].title).toBe('Refreshed Playlist')
  })

  it('linkByUrl sends the URL and refreshes', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockPlaylist],
        text: async () => JSON.stringify([mockPlaylist]),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPlaylist,
        text: async () => JSON.stringify(mockPlaylist),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockPlaylist],
        text: async () => JSON.stringify([mockPlaylist]),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      } as Response)

    const { result } = renderHook(() => usePlaylists())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.linkByUrl('https://www.youtube.com/playlist?list=PL_test')
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })
})
