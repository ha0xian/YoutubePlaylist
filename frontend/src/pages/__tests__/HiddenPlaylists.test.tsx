import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import HiddenPlaylists from '../HiddenPlaylists'
import { useAuth } from '../../auth/useAuth'
import * as playlistApi from '../../api/playlist'

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  vi.restoreAllMocks()
  mockedUseAuth.mockReturnValue({
    token: 'test-token',
    user: { id: 1, username: 'test', email: 'test@test.com' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  })
})

describe('HiddenPlaylists', () => {
  it('shows loading state initially', () => {
    // Keep fetch pending
    vi.spyOn(playlistApi, 'getHiddenPlaylists').mockReturnValue(
      new Promise(() => {}), // never resolves
    )

    render(
      <MemoryRouter>
        <HiddenPlaylists />
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading hidden playlists...')).toBeInTheDocument()
  })

  it('shows empty state when no hidden playlists', async () => {
    vi.spyOn(playlistApi, 'getHiddenPlaylists').mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <HiddenPlaylists />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No hidden playlists')).toBeInTheDocument()
  })

  it('renders hidden playlist cards', async () => {
    vi.spyOn(playlistApi, 'getHiddenPlaylists').mockResolvedValueOnce([
      {
        id: 1,
        youtubePlaylistId: 'PL_test',
        title: 'Hidden Playlist',
        channelTitle: 'Test Channel',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoCount: 5,
        description: 'A hidden playlist',
        publishedAt: '2026-01-01T00:00:00Z',
        sourceType: 'url',
        isHidden: true,
        isUnlinked: false,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])

    render(
      <MemoryRouter>
        <HiddenPlaylists />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Hidden Playlist')).toBeInTheDocument()
    expect(screen.getByText('Test Channel')).toBeInTheDocument()
    expect(screen.getByText('Restore')).toBeInTheDocument()
  })

  it('restores a playlist and removes it from the list', async () => {
    const user = userEvent.setup()

    vi.spyOn(playlistApi, 'getHiddenPlaylists').mockResolvedValueOnce([
      {
        id: 1,
        youtubePlaylistId: 'PL_test',
        title: 'Hidden Playlist',
        channelTitle: 'Test Channel',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoCount: 5,
        description: 'A hidden playlist',
        publishedAt: '2026-01-01T00:00:00Z',
        sourceType: 'url',
        isHidden: true,
        isUnlinked: false,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])

    vi.spyOn(playlistApi, 'showPlaylist').mockResolvedValueOnce(undefined)

    render(
      <MemoryRouter>
        <HiddenPlaylists />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Hidden Playlist')).toBeInTheDocument()

    await user.click(screen.getByText('Restore'))

    expect(playlistApi.showPlaylist).toHaveBeenCalledWith('test-token', 1)
    expect(await screen.findByText('No hidden playlists')).toBeInTheDocument()
  })
})
