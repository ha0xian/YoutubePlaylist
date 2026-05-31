export type PlaylistSourceType = 'oauth' | 'url'

export interface Thumbnail {
  url: string
  width: number
  height: number
}

export interface Video {
  id: number
  youtubeVideoId: string
  title: string
  channelTitle: string
  duration: string
  thumbnail: Thumbnail
  publishedAt: string
  viewCount: number
  position: number
  isRemoved: boolean
}

export interface Playlist {
  id: number
  youtubePlaylistId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  videoCount: number
  description: string
  publishedAt: string
  sourceType: PlaylistSourceType
  isHidden: boolean
  isUnlinked: boolean
  createdAt: string
  videos?: Video[]
}

export interface VideoNote {
  videoId: number
  bodyMarkdown: string
  updatedAt: string
}
