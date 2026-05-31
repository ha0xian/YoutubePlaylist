import type { Playlist, Video, VideoNote, PlaylistSourceType } from '../types/playlist'

/**
 * Transform a snake_case backend Video object into a camelCase frontend Video.
 */
export function transformVideo(raw: Record<string, unknown>): Video {
  return {
    id: raw.id as number,
    youtubeVideoId: raw.youtube_video_id as string,
    title: raw.title as string,
    channelTitle: raw.channel_title as string,
    duration: raw.duration as string,
    thumbnail: {
      url: raw.thumbnail_url as string,
      width: 320,
      height: 180,
    },
    publishedAt: raw.published_at as string,
    viewCount: raw.view_count as number,
    position: raw.position as number,
    isRemoved: raw.is_deleted as boolean,
  }
}

/**
 * Transform a snake_case backend Playlist object into a camelCase frontend Playlist.
 * If the raw response includes a "videos" array, it is transformed too.
 */
export function transformPlaylist(raw: Record<string, unknown>): Playlist {
  const playlist: Playlist = {
    id: raw.id as number,
    youtubePlaylistId: raw.youtube_playlist_id as string,
    title: raw.title as string,
    channelTitle: raw.channel_title as string,
    thumbnailUrl: raw.thumbnail_url as string,
    videoCount: raw.video_count as number,
    description: (raw.description as string) ?? '',
    publishedAt: raw.published_at as string,
    sourceType: raw.source_type as PlaylistSourceType,
    isHidden: raw.is_hidden as boolean,
    isUnlinked: raw.is_unlinked as boolean,
    createdAt: raw.created_at as string,
  }

  if (Array.isArray(raw.videos)) {
    playlist.videos = raw.videos.map((v: Record<string, unknown>) => transformVideo(v))
  }

  return playlist
}

/**
 * Transform a snake_case backend VideoNote object into a camelCase frontend VideoNote.
 */
export function transformVideoNote(raw: Record<string, unknown>): VideoNote {
  return {
    videoId: raw.video_id as number,
    bodyMarkdown: raw.body_markdown as string,
    updatedAt: raw.updated_at as string,
  }
}
