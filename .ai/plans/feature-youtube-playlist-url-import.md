# Plan: YouTube Playlist URL Import

## Goal

Remove frontend mock playlist/video data and implement authenticated per-user import of public YouTube playlists from URL. Imported playlist/video metadata must be fetched from YouTube Data API v3, stored in the Django database, and rendered by the existing playlist browser/detail/watch flows.

## Context

- Backend is Django REST Framework in `backend/`, with token-based registration, login, and current-user endpoints already implemented.
- Frontend is React + Vite + TypeScript in `frontend/`.
- `backend/api/models.py` currently has no playlist persistence models.
- `backend/api/views.py` currently exposes only root, register, login, and current user.
- `backend/api/tests.py` uses DRF `APITestCase` for focused auth endpoint coverage.
- DRF default permission is `AllowAny`, so all playlist endpoints must explicitly use `IsAuthenticated`.
- `frontend/src/data/mockData.ts` contains all playlist/video data and should be removed.
- `frontend/src/pages/PlaylistBrowser.tsx` and `frontend/src/pages/PlaylistDetail.tsx` directly import mock data today.
- `frontend/src/pages/WatchPage.tsx` only needs a YouTube video ID route parameter, so it can remain route-compatible.
- `AuthProvider` stores the auth token and exposes it through `useAuth`.
- Existing docs describe a broader YouTube integration, but this plan intentionally limits scope to mock-data removal and public playlist URL import.

## Assumptions

- Branch name is `feature-youtube-playlist-url-import`.
- Plan artifact path is `.ai/plans/feature-youtube-playlist-url-import.md`.
- State artifact path is `.ai/state/feature-youtube-playlist-url-import.json`.
- YouTube OAuth, hidden playlists, unlink, disconnect, persisted notes, and removed-video sync are out of scope for this slice.
- Backend uses a server-side `YOUTUBE_API_KEY` environment variable for public playlist URL imports.
- Imported playlists are scoped per app user. Two users may import the same YouTube playlist independently.
- Re-importing the same YouTube playlist URL for the same user updates cached metadata instead of creating a duplicate playlist.
- Normal browser/detail rendering reads only from the local backend database after import.

## Open Questions

None.

## Files To Modify

### `backend/requirements.txt`

- Add `requests>=2.32,<3.0` for server-side YouTube API requests.

### `backend/config/settings.py`

- Import `os`.
- Add `YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")`.
- Do not alter auth, CORS, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, or database settings.

### `backend/api/models.py`

- Add `Playlist` and `Video` persistence models.
- `Playlist` fields:
  - `user`: foreign key to `auth.User`, cascade delete.
  - `youtube_playlist_id`: indexed string.
  - `title`: string.
  - `channel_title`: string.
  - `thumbnail_url`: URL/text field, blank allowed.
  - `description`: text, blank allowed.
  - `published_at`: nullable datetime.
  - `video_count`: positive integer default `0`.
  - `source`: string, default `"url"`.
  - `created_at` and `updated_at`.
- Add a unique constraint for `(user, youtube_playlist_id)`.
- `Video` fields:
  - `playlist`: foreign key to `Playlist`, related name `videos`, cascade delete.
  - `youtube_video_id`: string.
  - `position`: positive integer.
  - `title`: string.
  - `channel_title`: string.
  - `duration`: string display value such as `4:05` or `1:02:03`.
  - `thumbnail_url`: URL/text field, blank allowed.
  - `published_at`: nullable datetime.
  - `view_count`: positive big integer default `0`.
  - `created_at` and `updated_at`.
- Add a unique constraint for `(playlist, youtube_video_id)`.
- Add default ordering by playlist and position where useful.

### `backend/api/serializers.py`

- Keep existing auth serializers unchanged.
- Add `PlaylistUrlImportSerializer` with required `url`.
- Add `VideoSerializer`.
- Add `PlaylistSerializer` for list-card responses.
- Add `PlaylistDetailSerializer` with nested ordered `videos`.
- Preserve backend response field names as snake_case.

### `backend/api/views.py`

- Keep existing auth views and response shapes unchanged.
- Add authenticated playlist views:
  - List current user's playlists.
  - Get current user's playlist detail.
  - Import playlist by public URL.
- Use `@permission_classes([IsAuthenticated])` on every playlist endpoint.
- Ensure detail lookup filters by `request.user`.
- Return `400` for missing, blank, or invalid playlist URLs.
- Return a user-friendly `400` when `YOUTUBE_API_KEY` is unset.
- Return a user-friendly `502` when YouTube API calls fail or playlist data is unavailable.

### `backend/api/urls.py`

- Add:
  - `GET /api/playlists/`
  - `GET /api/playlists/<int:pk>/`
  - `POST /api/playlists/import/`

### `backend/api/tests.py`

- Extend with focused playlist API tests.
- Mock outbound YouTube API calls; tests must not call the network.

### `frontend/src/types/playlist.ts`

- Replace mock-oriented types with API-backed types.
- `Playlist.id` should be the numeric backend ID.
- `Playlist` should include `youtubePlaylistId`, `title`, `channelTitle`, `thumbnailUrl`, `videoCount`, `description`, `publishedAt`, and `source`.
- `Video.id` should be the numeric backend video ID.
- `Video` should include `youtubeVideoId`, `title`, `channelTitle`, `duration`, `thumbnail`, `publishedAt`, `viewCount`, and `position`.
- Keep frontend field names camelCase.

### `frontend/src/api/auth.ts`

- Either export a reusable authenticated fetch helper or keep auth fetch unchanged and create equivalent shared behavior in the new playlist API module.
- Do not change existing auth API request or response contracts.

### `frontend/src/pages/PlaylistBrowser.tsx`

- Remove the mock data import.
- Fetch authenticated playlists from the backend using the current token from `useAuth`.
- Add a public playlist URL import form.
- Show loading, empty, success, and error states.
- On successful import, refresh the playlist list and clear the input.
- If import fails due to invalid URL, show the submitted URL and backend message.

### `frontend/src/pages/PlaylistDetail.tsx`

- Remove the mock data import.
- Fetch playlist detail from the backend by route `id`.
- Render loading, not-found/error, and empty video-list states.
- Use backend videos for `VideoListItem`.

### `frontend/src/components/PlaylistCard.tsx`

- Keep the layout mostly intact.
- Ensure numeric playlist IDs navigate correctly.
- Optionally show a small `URL` source badge if it fits the existing styling.

### `frontend/src/components/VideoListItem.tsx`

- Navigate using `video.youtubeVideoId`, not the numeric database video ID.
- Store `youtube-video-id` as `video.youtubeVideoId`.
- Preserve existing view-count and duration display behavior.

### `docs/features.md`

- Update feature status from mock playlist browser/detail to database-backed URL import.
- Note mock data removal.

## Files To Add

### `backend/api/migrations/0001_initial.py`

- Migration for `Playlist` and `Video`.
- If Django generates a different migration number because local migrations exist, use the next valid number.

### `backend/api/youtube.py`

- Backend-only YouTube import service.
- Expected exports:
  - `extract_playlist_id(url: str) -> str`
  - `fetch_playlist_payload(playlist_id: str) -> dict`
  - `import_playlist_for_user(user: User, url: str) -> tuple[Playlist, bool]`
- Responsibilities:
  - Parse playlist IDs from `youtube.com/playlist?list=...`, `youtube.com/watch?v=...&list=...`, and `youtu.be/<video>?list=...`.
  - Fetch playlist metadata via `playlists.list`.
  - Fetch all playlist items via paginated `playlistItems.list`.
  - Fetch video metadata via `videos.list` in batches of up to 50 IDs.
  - Store/update playlist and videos inside a transaction.
  - Delete stale local `Video` rows for the playlist during re-import for this slice.

### `frontend/src/api/playlists.ts`

- Frontend API client for playlist endpoints.
- Expected exports:
  - `listPlaylists(token: string): Promise<Playlist[]>`
  - `getPlaylist(token: string, id: string | number): Promise<PlaylistDetail>`
  - `importPlaylist(token: string, url: string): Promise<PlaylistDetail>`
- Must send `Authorization: Token <token>`.
- Must normalize backend snake_case response fields into frontend camelCase.

## Do Not Touch

- Do not implement YouTube OAuth.
- Do not implement hide, unhide, unlink, disconnect, removed-video sync, or notes persistence.
- Do not alter auth endpoint paths, request bodies, or response shapes.
- Do not weaken protected frontend routes or backend user scoping.
- Do not expose `YOUTUBE_API_KEY` to frontend code.
- Do not keep `frontend/src/data/mockData.ts` as fallback data.
- Do not add broad UI redesigns, theme work, search/filtering, or large navigation changes.
- Do not modify production-sensitive settings except adding `YOUTUBE_API_KEY`.

## Function Signatures And Interfaces

### Backend API

`GET /api/playlists/`

- Auth: required.
- Response `200`:

```json
[
  {
    "id": 1,
    "youtube_playlist_id": "PL...",
    "title": "Playlist title",
    "channel_title": "Channel",
    "thumbnail_url": "https://...",
    "video_count": 12,
    "description": "...",
    "published_at": "2026-01-01T00:00:00Z",
    "source": "url"
  }
]
```

`GET /api/playlists/<int:pk>/`

- Auth: required.
- Must only return playlists owned by `request.user`.
- Response `200` includes playlist fields plus ordered `videos`.
- Response `404` if missing or owned by another user.

`POST /api/playlists/import/`

- Auth: required.
- Request:

```json
{ "url": "https://www.youtube.com/playlist?list=PL..." }
```

- Response `201` for first import, `200` for re-import/update.
- Response body is playlist detail with nested videos.
- Missing/blank `url`: `400`.
- URL without playlist `list` parameter: `400`.
- Missing `YOUTUBE_API_KEY`: `400` with user-friendly message.
- YouTube API failure/unavailable playlist: `502` with user-friendly message.

### Backend Service

`extract_playlist_id(url: str) -> str`

- Returns playlist ID.
- Raises a validation-style exception for invalid URLs.

`import_playlist_for_user(user: User, url: str) -> tuple[Playlist, bool]`

- Returns playlist and boolean `created`.
- Performs all database writes transactionally.
- Never imports data for another user.

### Frontend API

`listPlaylists(token: string): Promise<Playlist[]>`

- Uses `GET /api/playlists/`.

`getPlaylist(token: string, id: string | number): Promise<PlaylistDetail>`

- Uses `GET /api/playlists/{id}/`.

`importPlaylist(token: string, url: string): Promise<PlaylistDetail>`

- Uses `POST /api/playlists/import/`.
- Throws `Error` with backend message on failure.

## Implementation Steps

1. Add backend settings and dependency support for `YOUTUBE_API_KEY` and `requests`.
2. Add `Playlist` and `Video` models plus migration.
3. Add YouTube URL parsing/import service with paginated playlist-item fetching and batched video-detail fetching.
4. Add serializers for list/detail/import responses.
5. Add authenticated playlist list, detail, and import views.
6. Add playlist URL routes.
7. Add backend tests with mocked YouTube responses covering import success, invalid URL, auth isolation, and re-import update.
8. Add frontend playlist API client and response normalization.
9. Update playlist types to match backend data.
10. Replace mock imports in browser/detail pages with authenticated API calls.
11. Add URL import UI and states to `PlaylistBrowser`.
12. Update `VideoListItem` to use `youtubeVideoId` for watch navigation.
13. Delete `frontend/src/data/mockData.ts`.
14. Update `docs/features.md`.
15. Run focused backend tests and frontend build/lint.

## Acceptance Criteria

- Authenticated users can paste a public YouTube playlist URL and import it.
- Imported playlists persist in the database and are scoped to the importing user.
- Playlist browser renders only the current user's imported playlists.
- Playlist detail renders videos from the database.
- Watch navigation still opens `/watch/<youtubeVideoId>`.
- The app no longer imports or renders mock playlist/video data.
- Invalid playlist URLs produce a clear error that includes or preserves the submitted URL in the UI.
- Unauthenticated API requests to playlist endpoints return `401`.
- One user cannot list or fetch another user's imported playlists.
- Re-importing the same playlist for the same user updates existing cached rows instead of duplicating the playlist.

## Testing Requirements

- Backend tests in `backend/api/tests.py`:
  - `POST /api/playlists/import/` requires auth.
  - Valid playlist URL imports playlist and videos from mocked YouTube API responses.
  - Invalid URL returns `400`.
  - `GET /api/playlists/` returns only current user playlists.
  - `GET /api/playlists/<id>/` returns `404` for another user's playlist.
  - Re-importing same playlist for same user does not create duplicate playlist rows.
- Frontend verification:
  - Run `npm run build`.
  - Run `npm run lint`.
  - Manual smoke test with backend mocked or real `YOUTUBE_API_KEY`: login, import URL, see playlist card, open detail, click video.
- Commands:
  - Backend: `cd backend && python manage.py test api`
  - Frontend: `cd frontend && npm run build && npm run lint`
- Out of scope:
  - End-to-end browser automation.
  - Snapshot tests.
  - Tests for OAuth, hidden playlists, notes persistence, or removed-video sync.

## Edge Cases

- Blank URL.
- Non-YouTube URL.
- YouTube watch/share URL with `list` query parameter.
- Playlist exists on YouTube but has zero videos.
- Playlist metadata exists but video details are missing for one or more items.
- YouTube API quota or key error.
- Same playlist imported by two different users.
- Same playlist re-imported by the same user.

## Risks

- YouTube API quota can be consumed quickly for large playlists; this slice should batch video-detail calls and avoid live API calls during normal page render.
- Frontend route `:id` changes from YouTube playlist ID strings to backend numeric playlist IDs.
- Existing docs describe broader behavior; Agent B must avoid pulling OAuth/notes/hide features into this slice.
- Missing local `YOUTUBE_API_KEY` will make manual import fail unless handled clearly.

## Out Of Scope

- YouTube OAuth and Google account linking.
- Hidden playlist page and hide/unhide actions.
- Playlist unlink/disconnect.
- Per-video notes persistence.
- Removed/deleted video sync behavior.
- Theme toggle or visual redesign.
- Search, filtering, pagination UI, or manual refresh.
- Deployment configuration beyond reading `YOUTUBE_API_KEY`.

## Done Definition

- Mock data file is removed and no source imports it.
- Database models and migrations exist for imported playlists/videos.
- Authenticated URL import endpoint works and stores data per user.
- Playlist browser/detail pages render backend data.
- Watch page still plays selected videos by YouTube ID.
- Focused backend tests pass.
- Frontend build and lint pass.
- `docs/features.md` reflects the new database-backed URL import state.
