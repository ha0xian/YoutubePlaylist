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
  source: string
}

export interface PlaylistDetail extends Playlist {
  videos: Video[]
}
