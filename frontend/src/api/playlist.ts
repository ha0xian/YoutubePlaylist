import { authFetch } from './auth'
import type { Playlist, VideoNote } from '../types/playlist'

export interface YouTubeAuthUrlResponse {
  auth_url: string
}

export interface OAuthCodeResponse {
  playlists: Playlist[]
  count: number
}

/** Fetch the YouTube OAuth authorization URL from the backend. */
export async function getYouTubeAuthUrl(token: string): Promise<YouTubeAuthUrlResponse> {
  return authFetch<YouTubeAuthUrlResponse>(
    '/api/youtube/auth-url/',
    { method: 'GET' },
    token,
  )
}

/** Exchange the OAuth authorization code for YouTube playlists. */
export async function sendOAuthCode(token: string, code: string): Promise<OAuthCodeResponse> {
  return authFetch<OAuthCodeResponse>(
    '/api/youtube/callback/',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    token,
  )
}

/** Disconnect the user's YouTube account. */
export async function disconnectYouTube(token: string): Promise<void> {
  await authFetch<unknown>(
    '/api/youtube/disconnect/',
    { method: 'POST' },
    token,
  )
}

/** Fetch all visible (non-hidden) playlists. */
export async function getPlaylists(token: string): Promise<Playlist[]> {
  return authFetch<Playlist[]>(
    '/api/playlists/',
    { method: 'GET' },
    token,
  )
}

/** Fetch hidden playlists. */
export async function getHiddenPlaylists(token: string): Promise<Playlist[]> {
  return authFetch<Playlist[]>(
    '/api/playlists/hidden/',
    { method: 'GET' },
    token,
  )
}

/** Fetch a single playlist by its DB id. */
export async function getPlaylistById(token: string, id: number): Promise<Playlist> {
  return authFetch<Playlist>(
    `/api/playlists/${id}/`,
    { method: 'GET' },
    token,
  )
}

/**
 * Link a playlist by a YouTube URL.
 * The URL is validated for basic format before sending.
 */
export async function linkPlaylistByUrl(token: string, url: string): Promise<Playlist> {
  const trimmed = url.trim()
  if (!isProbablyYoutubePlaylistUrl(trimmed)) {
    throw new Error(
      'Invalid YouTube playlist URL. Must contain youtube.com/playlist?list= or youtu.be/',
    )
  }

  return authFetch<Playlist>(
    '/api/playlists/link/',
    {
      method: 'POST',
      body: JSON.stringify({ url: trimmed }),
    },
    token,
  )
}

/** Hide a playlist (removes it from the default list view). */
export async function hidePlaylist(token: string, id: number): Promise<void> {
  await authFetch<unknown>(
    `/api/playlists/${id}/hide/`,
    { method: 'POST' },
    token,
  )
}

/** Unlink (permanently remove) a playlist and its videos. */
export async function unlinkPlaylist(token: string, id: number): Promise<void> {
  await authFetch<unknown>(
    `/api/playlists/${id}/unlink/`,
    { method: 'DELETE' },
    token,
  )
}

/** Fetch a saved note for a given video. */
export async function getVideoNote(token: string, videoId: number): Promise<VideoNote> {
  return authFetch<VideoNote>(
    `/api/videos/${videoId}/note/`,
    { method: 'GET' },
    token,
  )
}

/** Save (create or update) a markdown note for a given video. */
export async function saveVideoNote(
  token: string,
  videoId: number,
  bodyMarkdown: string,
): Promise<VideoNote> {
  return authFetch<VideoNote>(
    `/api/videos/${videoId}/note/`,
    {
      method: 'PUT',
      body: JSON.stringify({ body_markdown: bodyMarkdown }),
    },
    token,
  )
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Quick client-side check that a URL looks like a YouTube playlist link. */
function isProbablyYoutubePlaylistUrl(url: string): boolean {
  // Accept raw URLs containing youtube.com/playlist?list= or youtu.be/
  if (/youtube\.com\/playlist\?list=/i.test(url)) return true
  if (/youtu\.be\//i.test(url)) return true
  // Also accept just the list= param if it looks plausible
  const listParam = url.match(/[?&]list=([^&#]+)/)
  if (listParam && listParam[1].length >= 10) return true

  return false
}
