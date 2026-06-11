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
  publishedAt: string | null
  /** ``"url"`` — imported from a public URL; ``"oauth"`` — imported via YouTube OAuth; ``"personal"`` — built-in personal playlist. */
  source: 'url' | 'oauth' | 'personal' | string
  /** Whether the playlist has been unlinked from the user's visible collection. */
  isUnlinked: boolean
}

export interface PlaylistUnlinkResponse {
  id: number
  isUnlinked: true
  detail: string
}

export interface PlaylistDetail extends Playlist {
  videos: Video[]
}
