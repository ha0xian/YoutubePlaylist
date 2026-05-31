import { authFetch } from './auth'
import { transformPlaylist, transformVideoNote } from '../utils/transformers'
import type { Playlist, VideoNote } from '../types/playlist'

export interface YouTubeAuthUrlResponse {
  auth_url: string
}

export interface OAuthCodeResponse {
  playlists: Playlist[]
  count: number
}

export interface YouTubeStatusResponse {
  connected: boolean
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
  const raw = await authFetch<{ playlists: Record<string, unknown>[]; count: number }>(
    '/api/youtube/callback/',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    token,
  )
  return {
    playlists: raw.playlists.map((p: Record<string, unknown>) => transformPlaylist(p)),
    count: raw.count,
  }
}

/** Check whether the current user has a linked YouTube account. */
export async function getYouTubeStatus(token: string): Promise<YouTubeStatusResponse> {
  return authFetch<YouTubeStatusResponse>(
    '/api/youtube/status/',
    { method: 'GET' },
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
  const raw = await authFetch<Record<string, unknown>[]>(
    '/api/playlists/',
    { method: 'GET' },
    token,
  )
  return raw.map((p: Record<string, unknown>) => transformPlaylist(p))
}

/** Fetch hidden playlists. */
export async function getHiddenPlaylists(token: string): Promise<Playlist[]> {
  const raw = await authFetch<Record<string, unknown>[]>(
    '/api/playlists/hidden/',
    { method: 'GET' },
    token,
  )
  return raw.map((p: Record<string, unknown>) => transformPlaylist(p))
}

/** Fetch a single playlist by its DB id. */
export async function getPlaylistById(token: string, id: number): Promise<Playlist> {
  const raw = await authFetch<Record<string, unknown>>(
    `/api/playlists/${id}/`,
    { method: 'GET' },
    token,
  )
  return transformPlaylist(raw)
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

  const raw = await authFetch<Record<string, unknown>>(
    '/api/playlists/link/',
    {
      method: 'POST',
      body: JSON.stringify({ url: trimmed }),
    },
    token,
  )
  return transformPlaylist(raw)
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
    { method: 'POST' },
    token,
  )
}

/** Show (unhide/restore) a hidden playlist. */
export async function showPlaylist(token: string, id: number): Promise<void> {
  await authFetch<unknown>(
    `/api/playlists/${id}/show/`,
    { method: 'POST' },
    token,
  )
}

/** Fetch a saved note for a given video. */
export async function getVideoNote(token: string, videoId: number): Promise<VideoNote> {
  const raw = await authFetch<Record<string, unknown>>(
    `/api/notes/${videoId}/`,
    { method: 'GET' },
    token,
  )
  return transformVideoNote(raw)
}

/** Save (create or update) a markdown note for a given video. */
export async function saveVideoNote(
  token: string,
  videoId: number,
  bodyMarkdown: string,
): Promise<VideoNote> {
  const raw = await authFetch<Record<string, unknown>>(
    `/api/notes/${videoId}/`,
    {
      method: 'PUT',
      body: JSON.stringify({ body_markdown: bodyMarkdown }),
    },
    token,
  )
  return transformVideoNote(raw)
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
