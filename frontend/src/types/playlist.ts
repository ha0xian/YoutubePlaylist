export interface Video {
  id: number
  youtubeVideoId: string
  position: number
  title: string
  channelTitle: string
  duration: string
  thumbnailUrl: string
  publishedAt: string | null
  viewCount: number
}

export interface Playlist {
  id: number
  youtubePlaylistId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  videoCount: number
  description: string
  publishedAt: string | null
  /** ``"url"`` — imported from a public URL; ``"oauth"`` — imported via YouTube OAuth. */
  source: 'url' | 'oauth' | string
}

export interface PlaylistDetail extends Playlist {
  videos: Video[]
}
