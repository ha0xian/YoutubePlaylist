import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MarkdownNotes from '../MarkdownNotes'
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

describe('MarkdownNotes', () => {
  it('loads notes from backend on mount', async () => {
    vi.spyOn(playlistApi, 'getVideoNote').mockResolvedValueOnce({
      videoId: 42,
      bodyMarkdown: '# Hello from backend',
      updatedAt: '2026-05-01T12:00:00Z',
    })

    render(<MarkdownNotes videoId={42} />)

    expect(await screen.findByDisplayValue('# Hello from backend')).toBeInTheDocument()
  })

  it('shows loading state while fetching', () => {
    vi.spyOn(playlistApi, 'getVideoNote').mockReturnValue(
      new Promise(() => {}),
    )

    render(<MarkdownNotes videoId={42} />)
    expect(screen.getByText('Loading notes...')).toBeInTheDocument()
  })

  it('auto-saves notes when content changes', async () => {
    const user = userEvent.setup()

    vi.spyOn(playlistApi, 'getVideoNote').mockResolvedValueOnce({
      videoId: 42,
      bodyMarkdown: '',
      updatedAt: '2026-05-01T12:00:00Z',
    })

    const saveSpy = vi.spyOn(playlistApi, 'saveVideoNote').mockResolvedValueOnce({
      videoId: 42,
      bodyMarkdown: 'New note content',
      updatedAt: '2026-05-01T12:30:00Z',
    })

    render(<MarkdownNotes videoId={42} />)

    const textarea = await screen.findByPlaceholderText(/Write your notes/)
    await user.type(textarea, 'New note content')

    // Wait for debounced save (1500ms)
    await waitFor(
      () => {
        expect(saveSpy).toHaveBeenCalled()
      },
      { timeout: 3000 },
    )
  })

  it('toggles between edit and preview modes', async () => {
    const user = userEvent.setup()

    vi.spyOn(playlistApi, 'getVideoNote').mockResolvedValueOnce({
      videoId: 42,
      bodyMarkdown: '# Hello',
      updatedAt: '2026-05-01T12:00:00Z',
    })

    render(<MarkdownNotes videoId={42} />)

    // Wait for loading to finish
    await screen.findByDisplayValue('# Hello')

    // Should be in edit mode by default
    expect(screen.getByText('Preview')).toBeInTheDocument()

    // Switch to preview
    await user.click(screen.getByText('Preview'))

    // Now should show Edit button
    expect(screen.getByText('Edit')).toBeInTheDocument()

    // The markdown preview should render the heading
    expect(document.querySelector('.markdown-preview')).toBeInTheDocument()
  })

  it('handles note when token is not available', async () => {
    mockedUseAuth.mockReturnValue({
      token: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    })

    render(<MarkdownNotes videoId={42} />)

    // Should show empty textarea without errors
    const textarea = await screen.findByPlaceholderText(/Write your notes/)
    expect(textarea).toHaveValue('')
  })
})
