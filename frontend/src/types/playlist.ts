export interface Thumbnail {
  url: string
  width: number
  height: number
}

export interface Video {
  id: string
  title: string
  channelTitle: string
  duration: string
  thumbnail: Thumbnail
  publishedAt: string
  viewCount: number
}

export interface Playlist {
  id: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  videoCount: number
  description: string
  publishedAt: string
}
