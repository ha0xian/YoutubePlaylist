import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlaylistUrlInput from '../PlaylistUrlInput'

describe('PlaylistUrlInput', () => {
  it('renders input field and Import button', () => {
    render(<PlaylistUrlInput onLink={vi.fn()} isLoading={false} />)

    expect(screen.getByPlaceholderText('Paste a YouTube playlist URL...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('disables the Import button when input is empty', () => {
    render(<PlaylistUrlInput onLink={vi.fn()} isLoading={false} />)

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
  })

  it('shows validation error for non-YouTube URLs', async () => {
    const user = userEvent.setup()
    render(<PlaylistUrlInput onLink={vi.fn()} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a YouTube playlist URL...')
    await user.type(input, 'https://example.com/not-a-playlist')

    const importBtn = screen.getByRole('button', { name: 'Import' })
    await user.click(importBtn)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toContain('example.com')
  })

  it('accepts valid YouTube playlist URLs', async () => {
    const user = userEvent.setup()
    const onLink = vi.fn().mockResolvedValue(undefined)
    render(<PlaylistUrlInput onLink={onLink} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a YouTube playlist URL...')
    await user.type(input, 'https://www.youtube.com/playlist?list=PL_test_123')

    const importBtn = screen.getByRole('button', { name: 'Import' })
    await user.click(importBtn)

    // Wait for the async onLink to resolve
    await waitFor(() => {
      expect(onLink).toHaveBeenCalledWith('https://www.youtube.com/playlist?list=PL_test_123')
    })
  })

  it('clears input after successful import', async () => {
    const user = userEvent.setup()
    const onLink = vi.fn().mockResolvedValue(undefined)
    render(<PlaylistUrlInput onLink={onLink} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a YouTube playlist URL...')
    await user.type(input, 'https://youtu.be/PL_test_123')
    await user.click(screen.getByRole('button', { name: 'Import' }))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shows loading spinner when isLoading is true', () => {
    render(<PlaylistUrlInput onLink={vi.fn()} isLoading={true} />)

    // Button should show a spinner instead of text
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
  })
})
