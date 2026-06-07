# Plan: YouTube OAuth Selective Playlist Import

## Goal

Change the YouTube OAuth flow so connecting a YouTube account only links the account and stores encrypted tokens. After connection, the app must show the user's available YouTube playlists and let the user choose which playlists to import into the local app. Do not import every playlist automatically during OAuth callback.

## Context

- Backend is Django REST Framework in `backend/`, mounted under `/api/`.
- Frontend is React + TypeScript + Vite in `frontend/`.
- App authentication already uses DRF token auth. Frontend API calls send `Authorization: Token <token>`.
- `backend/api/models.py` has cached local `Playlist`, `Video`, `Note`, and `YouTubeOAuthToken` models.
- `Playlist` has unique constraint `(user, youtube_playlist_id)`, so selected OAuth imports must update an existing current-user row instead of creating duplicates.
- Public URL import already exists at `POST /api/playlists/import/` and stores `source="url"`.
- OAuth token storage, auth URL, callback, status, and disconnect endpoints are already part of the feature branch.
- The current OAuth implementation imports playlists in `youtube_callback` via `import_oauth_playlists_for_user(request.user)`. This must change.
- The current OAuth service can already call:
  - `channels.list(part=snippet, mine=true)`
  - `playlists.list(part=snippet,contentDetails, mine=true)`
  - `playlistItems.list(part=snippet,contentDetails, playlistId=...)`
  - `videos.list(part=contentDetails,statistics,snippet, id=...)`
- Product behavior now required by the human:
  - After connecting YouTube, users should see what playlists are available on their YouTube account.
  - Users should select which playlists to import.
  - Only selected playlists should be copied into the app database.
- Existing frontend `PlaylistBrowser` has:
  - URL import form
  - Connect YouTube / Disconnect YouTube controls
  - playlist grid for locally imported playlists
  - OAuth callback handling through query params
- Existing frontend `frontend/src/api/youtube.ts` is the right place for additional YouTube OAuth API calls.
- Current docs/features may be stale; update them only if they currently describe automatic OAuth import.

## Assumptions

- Branch name remains `feature-youtube-oauth-integration`.
- Plan artifact path remains `.ai/plans/feature-youtube-oauth-integration.md`.
- State artifact path remains `.ai/state/feature-youtube-oauth-integration.json`.
- YouTube OAuth is still optional and separate from app login.
- OAuth callback should store/refresh encrypted tokens and channel metadata, but should not call playlist import.
- The remote playlist picker can live on `PlaylistBrowser`; no new route is required for this slice.
- Importing selected playlists should cache full playlist/video metadata exactly like the current OAuth import path does.
- Existing URL-linked playlists must remain `source="url"` if the same YouTube playlist is later selected from OAuth.
- OAuth-created playlists should use `source="oauth"`.
- Disconnect keeps the existing semantics: remove OAuth token and remove only current-user `source="oauth"` local playlists, preserving URL playlists and notes.
- Large playlist libraries can be listed in one paginated backend request for now; frontend pagination/search is out of scope.
- Manual refresh/sync of already-imported playlists remains out of scope.

## Open Questions

None.

## Files To Modify

### `backend/api/youtube_oauth.py`

- Stop treating `import_oauth_playlists_for_user(user)` as the default callback behavior.
- Add a remote playlist listing helper that returns playlist choices without importing videos:
  - Fetch all playlists for the connected account using OAuth.
  - Return lightweight playlist metadata: YouTube playlist ID, title, channel title, thumbnail URL, description, published date, video count, and whether it is already imported locally for that user.
  - Handle `channelNotFound` as an empty list, not a backend crash.
- Add a selected import helper:
  - Accept a list of YouTube playlist IDs.
  - Fetch only those selected playlists and their videos.
  - Store/update only selected playlists and videos.
  - Preserve `source="url"` when an existing current-user URL playlist overlaps a selected OAuth playlist.
  - Set `source="oauth"` for new OAuth-created playlist rows.
- Refactor shared persistence logic so selected import and any existing OAuth import helper do not duplicate large blocks.
- Improve YouTube API errors enough to identify which endpoint failed while never logging or returning OAuth tokens.

### `backend/api/views.py`

- Modify `youtube_callback`:
  - Validate state.
  - Exchange code for tokens.
  - Store encrypted tokens.
  - Try to fetch/store channel profile.
  - Return connected status.
  - Do not import playlists.
  - Response should use `imported_playlist_count: 0` or omit that field only if frontend is updated consistently. Recommended: keep `imported_playlist_count: 0` for compatibility.
- Add authenticated view `youtube_remote_playlists`.
  - `GET /api/youtube/playlists/`
  - Requires an existing OAuth token for the current user.
  - Returns remote playlist choices without importing.
- Add authenticated view `youtube_import_playlists`.
  - `POST /api/youtube/playlists/import/`
  - Request body contains selected YouTube playlist IDs.
  - Imports only those selected playlists.
  - Returns imported playlist count and imported playlist details or IDs.
- Use `@permission_classes([IsAuthenticated])` on every new endpoint.
- Return `400` for missing/empty/invalid `playlist_ids`.
- Return `401` only for missing app auth; return `400` or `409` with a friendly message when the app user is authenticated but has not connected YouTube.
- Preserve existing `youtube_disconnect` behavior.

### `backend/api/urls.py`

- Add:
  - `GET /api/youtube/playlists/`
  - `POST /api/youtube/playlists/import/`
- Keep existing:
  - `GET /api/youtube/status/`
  - `GET /api/youtube/auth-url/`
  - `POST /api/youtube/callback/`
  - `POST /api/youtube/disconnect/`

### `backend/api/tests.py`

- Update callback success tests so callback verifies token storage and connection but does not create `Playlist` or `Video` rows.
- Add tests for remote playlist listing:
  - requires auth
  - requires connected YouTube token
  - returns remote playlist metadata
  - marks `is_imported` true when current user already has that playlist locally
  - handles no YouTube channel as an empty list
- Add tests for selected import:
  - requires auth
  - requires connected YouTube token
  - rejects missing, empty, or non-list `playlist_ids`
  - imports only selected playlist IDs, not all remote playlists
  - preserves `source="url"` for overlapping current-user URL playlist
  - creates `source="oauth"` for selected new playlists
  - does not import unselected playlists returned by mocked YouTube
- Keep all outbound Google/YouTube calls mocked.

### `frontend/src/api/youtube.ts`

- Add remote playlist and selected import types.
- Add API functions:
  - `listYouTubePlaylists(token: string): Promise<YouTubeRemotePlaylist[]>`
  - `importYouTubePlaylists(token: string, playlistIds: string[]): Promise<YouTubePlaylistImportResponse>`
- Keep `completeYouTubeOAuth` but update expected callback semantics so success means "connected", not "all playlists imported".
- Keep `disconnectYouTube` unchanged.

### `frontend/src/pages/PlaylistBrowser.tsx`

- Update OAuth callback handling:
  - after `completeYouTubeOAuth`, refresh OAuth status
  - load the remote playlist choices
  - do not expect local playlist cards to appear unless the user imports selected playlists
- Add a connected YouTube playlist picker section near the existing Connect/Disconnect row.
- When connected:
  - show a "Load YouTube playlists" or auto-load remote playlists once after connection/status load
  - list remote playlists with thumbnail/title/channel/video count/imported state
  - allow selecting one or more non-imported playlists
  - provide an "Import selected" action
  - show importing/loading/error states
  - refresh local playlist grid after selected import succeeds
- Keep public playlist URL import unchanged.
- Keep disconnect available. On disconnect, clear remote playlist choices and selected IDs.
- Avoid broad visual redesign; this is a functional selection UI.

### `frontend/src/types/playlist.ts`

- No required local cached playlist shape changes.
- If `source` is narrowed, ensure it still allows `"url"` and `"oauth"`.

### `frontend/src/components/PlaylistCard.tsx`

- No required changes unless the OAuth badge is not already present.
- Do not alter navigation behavior.

### `docs/features.md`

- Update OAuth status to say:
  - connection/linking is implemented
  - remote playlist picker/selective import is implemented after this change
  - automatic import of all OAuth playlists is not the behavior
- Do not mark hidden playlists, removed-video sync, manual refresh, or theme toggle as implemented.

## Files To Add

None required.

If Agent B finds the playlist picker too large for `PlaylistBrowser`, it may add:

### `frontend/src/components/YouTubePlaylistPicker.tsx`

- Purpose: focused UI for listing remote YouTube playlists, selecting IDs, and triggering selected import.
- Props should be constrained to:
  - `playlists: YouTubeRemotePlaylist[]`
  - `selectedIds: Set<string>` or `string[]`
  - `isLoading: boolean`
  - `isImporting: boolean`
  - `error: string | null`
  - `onToggle(id: string): void`
  - `onImportSelected(): void`
  - `onReload(): void`

## Do Not Touch

- Do not change app login/register/current-user contracts.
- Do not replace DRF token authentication.
- Do not expose Google access tokens, refresh tokens, client secrets, auth codes, or encryption keys to frontend code.
- Do not store OAuth tokens in frontend storage or route state.
- Do not log OAuth tokens, auth codes, secrets, encryption keys, or full sensitive Google payloads.
- Do not change public URL import behavior or endpoint path.
- Do not auto-import every OAuth playlist during callback.
- Do not delete URL-linked playlists during disconnect.
- Do not alter note persistence, markdown rendering, or note API behavior.
- Do not implement hidden playlist management, unlink-per-playlist, removed-video sync, manual refresh, theme toggle, search/filtering, AI features, or broad UI redesign.
- Do not make live YouTube API calls during normal local playlist grid/detail rendering.
- Do not update generated build output, `node_modules/`, local database files, virtualenvs, screenshots, or caches.

## Function Signatures And Interfaces

### Backend OAuth Service

```python
def list_remote_playlists_for_user(user: User) -> list[dict]: ...
def import_selected_oauth_playlists_for_user(
    user: User,
    playlist_ids: list[str],
) -> tuple[list[Playlist], int]: ...
```

`list_remote_playlists_for_user` response item constraints:

```python
{
    "youtube_playlist_id": str,
    "title": str,
    "channel_title": str,
    "thumbnail_url": str,
    "description": str,
    "published_at": str | None,
    "video_count": int,
    "is_imported": bool,
    "local_playlist_id": int | None,
    "source": "url" | "oauth" | None,
}
```

`import_selected_oauth_playlists_for_user` behavior:

- Requires connected YouTube token.
- Validates `playlist_ids` is a non-empty list of strings.
- Fetches only selected playlist IDs.
- Returns imported/updated `Playlist` rows plus count.
- Raises `YouTubeOAuthError` or `YouTubeAPIError` with user-safe messages.

### Backend API

`POST /api/youtube/callback/`

- Auth: required.
- Request:

```json
{
  "code": "authorization-code-from-google",
  "state": "signed-state"
}
```

- Response `200`:

```json
{
  "connected": true,
  "imported_playlist_count": 0,
  "channel_id": "UC...",
  "channel_title": "Channel name"
}
```

- Must not import playlists.

`GET /api/youtube/playlists/`

- Auth: required.
- Requires connected YouTube token.
- Response `200`:

```json
[
  {
    "youtube_playlist_id": "PL...",
    "title": "Playlist title",
    "channel_title": "Channel",
    "thumbnail_url": "https://...",
    "description": "...",
    "published_at": "2026-01-01T00:00:00Z",
    "video_count": 12,
    "is_imported": false,
    "local_playlist_id": null,
    "source": null
  }
]
```

`POST /api/youtube/playlists/import/`

- Auth: required.
- Requires connected YouTube token.
- Request:

```json
{
  "playlist_ids": ["PL...", "PL..."]
}
```

- Response `200`:

```json
{
  "imported_playlist_count": 2,
  "playlists": [
    {
      "id": 1,
      "youtube_playlist_id": "PL...",
      "title": "Playlist title",
      "channel_title": "Channel",
      "thumbnail_url": "https://...",
      "video_count": 12,
      "description": "...",
      "published_at": "2026-01-01T00:00:00Z",
      "source": "oauth"
    }
  ]
}
```

- Missing/empty/non-list `playlist_ids`: `400`.
- User not connected to YouTube: `400` or `409` with a friendly message.
- YouTube API failure: `502`.

### Frontend API

```ts
export interface YouTubeRemotePlaylist {
  youtubePlaylistId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  description: string
  publishedAt: string | null
  videoCount: number
  isImported: boolean
  localPlaylistId: number | null
  source: 'url' | 'oauth' | null
}

export interface YouTubePlaylistImportResponse {
  importedPlaylistCount: number
  playlists: Playlist[]
}

export function listYouTubePlaylists(
  token: string,
): Promise<YouTubeRemotePlaylist[]>

export function importYouTubePlaylists(
  token: string,
  playlistIds: string[],
): Promise<YouTubePlaylistImportResponse>
```

## Implementation Steps

1. In `backend/api/youtube_oauth.py`, split "list remote OAuth playlists" from "import selected OAuth playlists".
2. Update `youtube_callback` so it stores tokens/channel metadata only and returns `imported_playlist_count: 0`.
3. Add `youtube_remote_playlists` and `youtube_import_playlists` views in `backend/api/views.py`.
4. Add routes for `GET /api/youtube/playlists/` and `POST /api/youtube/playlists/import/` in `backend/api/urls.py`.
5. Update backend tests to remove automatic-import expectations from callback tests.
6. Add backend tests for remote playlist listing and selected import.
7. Add `YouTubeRemotePlaylist`, `YouTubePlaylistImportResponse`, `listYouTubePlaylists`, and `importYouTubePlaylists` to `frontend/src/api/youtube.ts`.
8. Update `PlaylistBrowser` OAuth callback flow to load remote playlist choices after connection instead of refreshing local playlists expecting automatic import.
9. Add connected-state playlist picker UI with selection and "Import selected" action.
10. Refresh local `listPlaylists` data after selected import succeeds.
11. Clear remote choices and selected IDs on disconnect.
12. Update `docs/features.md`.
13. Run backend tests, frontend build, and frontend lint.

## Acceptance Criteria

- [ ] Connecting YouTube stores/refreshes encrypted OAuth tokens but does not create local `Playlist` or `Video` rows.
- [ ] After connecting, the frontend can show available remote YouTube playlists for that account.
- [ ] Remote playlists show enough metadata for a user to choose: title, channel, thumbnail, and video count.
- [ ] Already-imported remote playlists are marked as imported.
- [ ] User can select one or more remote playlists and import them.
- [ ] Only selected playlist IDs are imported.
- [ ] Unselected remote playlists are not imported.
- [ ] Selected OAuth-created playlists appear in the local playlist grid after import.
- [ ] Existing URL-linked playlists remain `source="url"` if selected via OAuth.
- [ ] New selected OAuth playlists use `source="oauth"`.
- [ ] Public URL import still works unchanged.
- [ ] Disconnect still removes OAuth token and local `source="oauth"` playlists only.
- [ ] No OAuth tokens or secrets are exposed to frontend responses or browser storage.

## Testing Requirements

- Backend tests in `backend/api/tests.py`:
  - Callback success stores token and returns connected, but imports zero playlists.
  - Callback success does not create local playlist/video rows.
  - `GET /api/youtube/playlists/` requires auth.
  - `GET /api/youtube/playlists/` returns a friendly error when not connected.
  - `GET /api/youtube/playlists/` returns remote playlist choices from mocked YouTube.
  - `GET /api/youtube/playlists/` marks existing local playlists as imported with local ID and source.
  - `POST /api/youtube/playlists/import/` requires auth.
  - `POST /api/youtube/playlists/import/` rejects missing/empty/non-list `playlist_ids`.
  - `POST /api/youtube/playlists/import/` imports only selected playlist IDs.
  - Selected import preserves `source="url"` overlap.
  - Selected import creates `source="oauth"` for new playlists.
- Frontend verification:
  - `cd frontend && npm run build`
  - `cd frontend && npm run lint`
  - Manual smoke:
    - connect YouTube
    - see remote playlist choices
    - select one playlist
    - import selected
    - verify only selected playlist appears in local grid
    - disconnect
- Backend command:
  - `cd backend && python manage.py test api`
- Out of scope:
  - full browser automation against real Google OAuth
  - search/filter/pagination tests
  - hidden playlist tests
  - removed-video sync tests

## Edge Cases

- Connected Google account has no YouTube channel.
- Connected YouTube channel has zero playlists.
- Remote playlist has zero videos.
- Remote playlist is already imported by URL.
- Remote playlist is already imported by OAuth.
- User selects duplicate playlist IDs.
- User selects playlist IDs that are no longer returned by YouTube.
- YouTube API returns quota/403 errors.
- Access token expires before listing or selected import; refresh token should be used.
- Refresh token is missing/revoked.
- User disconnects while remote playlist picker is visible.

## Risks

- Separating list from import introduces more live YouTube API calls; keep them limited to explicit connected-account picker actions.
- A single `Playlist.source` field cannot represent "both URL and OAuth"; preserving `source="url"` is required so disconnect does not remove URL-linked playlists.
- Callback compatibility needs care: frontend should not assume `importedPlaylistCount > 0` after connect.
- Accounts without a YouTube channel may connect successfully but show no remote playlists.
- Large playlist libraries may create a long picker; search/pagination is intentionally out of scope for this slice.

## Out Of Scope

- Import-all-on-callback behavior.
- Search/filtering remote playlists.
- Pagination UI for very large remote playlist libraries.
- Manual refresh/sync of imported playlists.
- Hidden playlists, unhide, per-playlist unlink, removed-video tracking.
- Theme toggle or broad visual redesign.
- Google OAuth as app login.
- Non-YouTube Google APIs.

## Done Definition

- [ ] Plan branch remains `feature-youtube-oauth-integration`.
- [ ] OAuth callback connects but does not import local playlists.
- [ ] Backend exposes authenticated remote playlist list and selected import endpoints.
- [ ] Frontend shows connected user's remote playlists after YouTube connection.
- [ ] Frontend lets user select and import specific playlists.
- [ ] Only selected playlists are persisted locally.
- [ ] Existing URL import and disconnect semantics are preserved.
- [ ] Focused backend tests pass.
- [ ] Frontend build and lint pass.
- [ ] `docs/features.md` reflects selective OAuth import behavior.
