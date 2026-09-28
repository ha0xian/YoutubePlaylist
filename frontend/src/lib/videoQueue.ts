import type { Video } from '../types/playlist'

export type QueueSort = 'playlist' | 'recentlyAdded' | 'title' | 'views' | 'published'
export type QueueDirection = 'asc' | 'desc'

export function filterAndSortVideos(
  videos: Video[],
  query: string,
  sort: QueueSort,
  direction: QueueDirection = 'asc',
): Video[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = normalizedQuery
    ? videos.filter((video) => `${video.title}\n${video.channelTitle}`.toLocaleLowerCase().includes(normalizedQuery))
    : videos

  return filtered.toSorted((a, b) => {
    let comparison: number
    switch (sort) {
      case 'title':
        comparison = a.title.localeCompare(b.title) || a.position - b.position
        break
      case 'views':
        comparison = a.viewCount - b.viewCount || a.position - b.position
        break
      case 'published':
        comparison = (Date.parse(a.publishedAt ?? '') || 0) - (Date.parse(b.publishedAt ?? '') || 0) || a.position - b.position
        break
      case 'recentlyAdded':
        comparison = (Date.parse(a.addedAt ?? '') || 0) - (Date.parse(b.addedAt ?? '') || 0) || a.position - b.position
        break
      case 'playlist':
        comparison = a.position - b.position
        break
    }
    return direction === 'asc' ? comparison : -comparison
  })
}
