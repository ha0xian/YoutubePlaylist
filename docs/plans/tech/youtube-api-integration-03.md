---
feature: youtube-api-integration
slice: 03
area: frontend
mode: extend
parallel-safe-with: [youtube-api-integration-01, youtube-api-integration-02]
---

# Frontend API client, types, and data hooks

## Goal

Add TypeScript types for YouTube-linked playlists and videos, create the API client functions for all new backend endpoints, and build the React hooks that pages will consume.

## Files

- `frontend/src/types/playlist.ts` (extend) -- add PlaylistSourceType, update Playlist and Video interfaces with source/hidden/removed fields
- `frontend/src/api/playlist.ts` (new) -- API functions: getPlaylists, getHiddenPlaylists, getPlaylistById, linkPlaylistByUrl, hidePlaylist, unhidePlaylist, unlinkPlaylist, getYouTubeAuthUrl, sendOAuthCode, disconnectYouTube, getVideoNote, saveVideoNote
- `frontend/src/hooks/usePlaylists.ts` (new) -- custom hook returning playlists, loading, error, refresh actions
- `frontend/src/api/auth.ts` (extend) -- add reusable `authFetch` helper export (currently private) so `api/playlist.ts` can use it

## Interfaces

### Updated types (`playlist.ts`)

```typescript
export type PlaylistSourceType = 'oauth' | 'url'

// Existing fields stay; new fields added:
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

export interface Video {
  id: number
  youtubeVideoId: string
  title: string
  channelTitle: string
  duration: string
  thumbnail: { url: string; width: number; height: number }
  publishedAt: string
  viewCount: number
  position: number
  isRemoved: boolean
}

export interface VideoNote {
  videoId: number
  bodyMarkdown: string
  updatedAt: string
}
```

Note: `Video.id` changes meaning from YouTube video ID (string) to DB primary key (number). The `youtubeVideoId` field carries the YouTube ID. Update any code that references `video.id` as the YouTube ID to use `video.youtubeVideoId` instead.

### API client (`api/playlist.ts`)

Reuse the `authFetch` helper from `api/auth.ts` (make it an exported utility). All functions accept the auth token (retrieved from localStorage or context).

```typescript
// Export the existing parseJson and authFetch utilities from api/auth.ts,
// or create a shared api/client.ts. For simplicity, refactor api/auth.ts
// to export authFetch so api/playlist.ts can import it.

export interface YouTubeAuthUrlResponse {
  auth_url: string
}

export interface PlaylistListResponse {
  // TODO: exact shape TBD — likely a plain array from Django
}

export async function getYouTubeAuthUrl(token: string): Promise<YouTubeAuthUrlResponse>
export async function sendOAuthCode(token: string, code: string): Promise<{ playlists: Playlist[]; count: number }>

export async function getPlaylists(token: string): Promise<Playlist[]>
export async function getHiddenPlaylists(token: string): Promise<Playlist[]>
export async function getPlaylistById(token: string, id: number): Promise<Playlist>
export async function linkPlaylistByUrl(token: string, url: string): Promise<Playlist>
export async function hidePlaylist(token: string, id: number): Promise<void>
export async function unhidePlaylist(token: string, id: number): Promise<void>
export async function unlinkPlaylist(token: string, id: number): Promise<void>
export async function disconnectYouTube(token: string): Promise<void>
export async function getVideoNote(token: string, videoId: number): Promise<VideoNote>
export async function saveVideoNote(token: string, videoId: number, bodyMarkdown: string): Promise<VideoNote>
```

### Hook (`usePlaylists.ts`)

```typescript
export function usePlaylists() {
  // Returns:
  // - playlists: Playlist[]
  // - isLoading: boolean
  // - error: string | null
  // - refresh: () => void
  // - linkByUrl: (url: string) => Promise<void>
  // - hide: (id: number) => Promise<void>
  // - unhide: (id: number) => Promise<void>
  // - unlink: (id: number) => Promise<void>
  // - disconnectYouTube: () => Promise<void>
}
```

The hook should:
- On mount, fetch playlists from `GET /api/playlists/` using the auth token from AuthContext
- On API error, show an error state; mock playlist fallback is out of scope
- Expose mutation actions (linkByUrl, hide, unhide, unlink, disconnect) that call the API and refresh the list
- Use backend playlists only

## Acceptance

- [ ] `cd frontend && npx tsc -b` passes with all new types and API functions
- [ ] `getPlaylists()` successfully fetches playlists from a running backend
- [ ] `linkPlaylistByUrl()` sends correct POST body and returns a playlist
- [ ] `usePlaylists()` hook returns playlists and handles loading/error states
- [ ] API errors produce a visible error state without falling back to mock data

## Tests

- `frontend/src/api/__tests__/playlist.test.ts` (new) -- mock fetch and test each API function
- `frontend/src/hooks/__tests__/usePlaylists.test.ts` (new) -- test hook with mocked API calls

Use `vitest` with `vi.mock()` to mock fetch calls.

## Size

M

## Security

### Findings

1. **No tokens stored in frontend state from YouTube OAuth.** The plan correctly keeps OAuth tokens server-side. The frontend only handles the one-time authorization code from the URL query string during the OAuth callback. Ensure the `YouTubeCallbackHandler` (Slice 04) extracts the `code` from the URL, sends it to the backend, and does NOT store it in localStorage, sessionStorage, or any frontend state.

2. **`authFetch` export shares authentication token across all API modules.** Refactoring `authFetch` to be an exported utility from `api/auth.ts` means any module can make authenticated requests. This is the correct pattern (DRY), but ensure the token is only read from the single source of truth (`localStorage` via `TOKEN_STORAGE_KEY` constant in `AuthContext.ts`) and not passed around as a prop or stored in multiple places.

3. **No mock fallback.** The `usePlaylists` hook should require app authentication and backend data. When the backend is unavailable, show a clear error state rather than substituting mock playlists.

4. **Playlist `id` type is numeric.** The backend API returns numeric Django primary keys. Route params should be parsed to numbers before comparing with playlist IDs.

5. **`linkPlaylistByUrl` sends URL in POST body.** The URL is user-supplied and sent to the backend. The frontend should validate the URL format before sending (check for `youtube.com/playlist?list=` or `youtu.be/` pattern) but should NOT sanitize the URL beyond basic format validation -- URL validation and extraction of the playlist ID is the backend's responsibility. This prevents frontend validation bypass attacks.

### No blockers. Five findings above are advisory or should-fix level.
