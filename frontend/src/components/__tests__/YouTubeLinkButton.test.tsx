import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YouTubeLinkButton from '../YouTubeLinkButton'
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

describe('YouTubeLinkButton', () => {
  it('renders sign in button', () => {
    render(<YouTubeLinkButton />)
    expect(screen.getByRole('button', { name: /sign in with youtube/i })).toBeInTheDocument()
  })

  it('opens OAuth URL on click', async () => {
    const user = userEvent.setup()

    // Mock getYouTubeAuthUrl
    vi.spyOn(playlistApi, 'getYouTubeAuthUrl').mockResolvedValueOnce({
      auth_url: 'https://accounts.google.com/o/oauth2/auth?state=xyz',
    })

    // Mock window.location.href by saving original and reassigning
    const originalLocation = window.location
    const locationMock = { ...originalLocation, href: '' } as unknown as Location
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
    })

    render(<YouTubeLinkButton />)

    await user.click(screen.getByRole('button', { name: /sign in with youtube/i }))

    expect(playlistApi.getYouTubeAuthUrl).toHaveBeenCalledWith('test-token')
    expect(window.location.href).toBe('https://accounts.google.com/o/oauth2/auth?state=xyz')

    // Restore
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('shows error when API call fails', async () => {
    const user = userEvent.setup()

    vi.spyOn(playlistApi, 'getYouTubeAuthUrl').mockRejectedValueOnce(
      new Error('Network error'),
    )

    render(<YouTubeLinkButton />)

    await user.click(screen.getByRole('button', { name: /sign in with youtube/i }))

    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('does not render anything when token is null', () => {
    mockedUseAuth.mockReturnValue({
      token: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    const { container } = render(<YouTubeLinkButton />)
    expect(container.textContent).toBeFalsy()
  })
})
