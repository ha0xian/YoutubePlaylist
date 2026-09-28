import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAndSortVideos } from '../src/lib/videoQueue.ts'
import type { Video } from '../src/types/playlist.ts'

const makeVideo = (overrides: Partial<Video>): Video => ({
  id: 1, youtubeVideoId: 'video-id-01', position: 0, title: 'Beta', channelTitle: 'Tutor',
  description: '', duration: '1:00', thumbnailUrl: '', publishedAt: null, addedAt: null, viewCount: 0, isRemoved: false,
  ...overrides,
})

const videos = [
  makeVideo({ id: 1, position: 0, title: 'Beta', viewCount: 20, publishedAt: '2025-01-01T00:00:00Z', addedAt: '2026-02-01T00:00:00Z' }),
  makeVideo({ id: 2, position: 1, title: 'Alpha', channelTitle: 'Another channel', viewCount: 50, publishedAt: '2026-01-01T00:00:00Z', addedAt: '2026-01-01T00:00:00Z' }),
]

test('queue search matches titles and channels without changing the source array', () => {
  assert.deepEqual(filterAndSortVideos(videos, 'another', 'playlist').map((video) => video.id), [2])
  assert.deepEqual(videos.map((video) => video.id), [1, 2])
})

test('queue sorting supports all fields in ascending and descending directions', () => {
  assert.deepEqual(filterAndSortVideos(videos, '', 'title').map((video) => video.id), [2, 1])
  assert.deepEqual(filterAndSortVideos(videos, '', 'views').map((video) => video.id), [1, 2])
  assert.deepEqual(filterAndSortVideos(videos, '', 'published').map((video) => video.id), [1, 2])
  assert.deepEqual(filterAndSortVideos(videos, '', 'recentlyAdded').map((video) => video.id), [2, 1])
  assert.deepEqual(filterAndSortVideos(videos, '', 'recentlyAdded', 'desc').map((video) => video.id), [1, 2])
  assert.deepEqual(filterAndSortVideos(videos.toReversed(), '', 'playlist').map((video) => video.id), [1, 2])
  assert.deepEqual(filterAndSortVideos(videos, '', 'playlist', 'desc').map((video) => video.id), [2, 1])
})
