import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PlaylistBrowser from '../PlaylistBrowser'
import { useAuth } from '../../auth/useAuth'
import { usePlaylists } from '../../hooks/usePlaylists'
import type { Playlist } from '../../types/playlist'

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/usePlaylists', () => ({
  usePlaylists: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUsePlaylists = vi.mocked(usePlaylists)

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

function renderPlaylistBrowser() {
  return render(
    <MemoryRouter>
      <PlaylistBrowser />
    </MemoryRouter>,
  )
}

describe('PlaylistBrowser', () => {
  it('renders the page title', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      fetchById: vi.fn(),
      fetchHidden: vi.fn(),
      linkByUrl: vi.fn(),
      hide: vi.fn(),
      unlink: vi.fn(),
      restore: vi.fn(),
      disconnectYouTube: vi.fn(),
    })

    renderPlaylistBrowser()
    expect(screen.getByText('Playlists')).toBeInTheDocument()
  })

  it('shows loading spinner while loading', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      fetchById: vi.fn(),
      fetchHidden: vi.fn(),
      linkByUrl: vi.fn(),
      hide: vi.fn(),
      unlink: vi.fn(),
      restore: vi.fn(),
      disconnectYouTube: vi.fn(),
    })

    renderPlaylistBrowser()
    // The loading spinner should be visible (it's rendered as a spinning element)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error message when fetch fails', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      isLoading: false,
      error: 'Server error',
      refresh: vi.fn(),
      fetchById: vi.fn(),
      fetchHidden: vi.fn(),
      linkByUrl: vi.fn(),
      hide: vi.fn(),
      unlink: vi.fn(),
      restore: vi.fn(),
      disconnectYouTube: vi.fn(),
    })

    renderPlaylistBrowser()
    expect(screen.getByText('Server error')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('renders playlist cards from the hook', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [mockPlaylist],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      fetchById: vi.fn(),
      fetchHidden: vi.fn(),
      linkByUrl: vi.fn(),
      hide: vi.fn(),
      unlink: vi.fn(),
      restore: vi.fn(),
      disconnectYouTube: vi.fn(),
    })

    renderPlaylistBrowser()
    expect(screen.getByText('Test Playlist')).toBeInTheDocument()
    expect(screen.getByText('Test Channel')).toBeInTheDocument()
    expect(screen.getByText('5 videos')).toBeInTheDocument()
  })

  it('shows empty state when no playlists', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      fetchById: vi.fn(),
      fetchHidden: vi.fn(),
      linkByUrl: vi.fn(),
      hide: vi.fn(),
      unlink: vi.fn(),
      restore: vi.fn(),
      disconnectYouTube: vi.fn(),
    })

    renderPlaylistBrowser()
    expect(screen.getByText('No playlists yet')).toBeInTheDocument()
  })

  it('renders the Link YouTube Playlist section', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      fetchById: vi.fn(),
      fetchHidden: vi.fn(),
      linkByUrl: vi.fn(),
      hide: vi.fn(),
      unlink: vi.fn(),
      restore: vi.fn(),
      disconnectYouTube: vi.fn(),
    })

    renderPlaylistBrowser()
    expect(screen.getByText('Link YouTube Playlist')).toBeInTheDocument()
    expect(screen.getByText('OR')).toBeInTheDocument()
    expect(screen.getByText('View hidden playlists')).toBeInTheDocument()
  })
})
