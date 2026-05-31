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

export interface VideoNote {
  id: number
  video: number
  body_markdown: string
  created_at: string
  updated_at: string
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
