import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import VideoListItem from '../VideoListItem'
import type { Video } from '../../types/playlist'

const baseVideo: Video = {
  id: 42,
  youtubeVideoId: 'dQw4w9WgXcQ',
  title: 'Test Video Title',
  channelTitle: 'Test Channel',
  duration: '10:30',
  thumbnail: { url: 'https://example.com/thumb.jpg', width: 320, height: 180 },
  publishedAt: '2026-01-01T00:00:00Z',
  viewCount: 15000,
  position: 0,
  isRemoved: false,
}

function renderVideo(video: Video) {
  return render(
    <MemoryRouter>
      <VideoListItem video={video} />
    </MemoryRouter>,
  )
}

describe('VideoListItem', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders video information', () => {
    renderVideo(baseVideo)

    expect(screen.getByText('Test Video Title')).toBeInTheDocument()
    expect(screen.getByText('Test Channel')).toBeInTheDocument()
    expect(screen.getByText('15K views')).toBeInTheDocument()
    expect(screen.getByText('10:30')).toBeInTheDocument()
  })

  it('stores video IDs in localStorage on click', async () => {
    const user = userEvent.setup()
    renderVideo(baseVideo)

    await user.click(screen.getByText('Test Video Title'))

    expect(localStorage.getItem('youtube-video-id')).toBe('dQw4w9WgXcQ')
    expect(localStorage.getItem('video-db-id')).toBe('42')
  })

  it('shows removed styling when isRemoved is true', () => {
    renderVideo({ ...baseVideo, isRemoved: true })

    // The title should have line-through styling
    const title = screen.getByText('Test Video Title')
    expect(title.className).toContain('line-through')

    // Should show a "Removed" badge
    expect(screen.getByText('Removed')).toBeInTheDocument()
  })

  it('does not show Removed badge when isRemoved is false', () => {
    renderVideo(baseVideo)

    expect(screen.queryByText('Removed')).not.toBeInTheDocument()
  })
})
