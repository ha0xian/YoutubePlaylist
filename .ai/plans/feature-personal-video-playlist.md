# Plan: Personal Video Playlist

## Goal

Add one built-in, app-owned personal playlist per authenticated user. The playlist is not a YouTube playlist and is not linked to YouTube OAuth or public YouTube playlist imports. Users can add YouTube videos to this personal playlist by pasting a YouTube video URL or 11-character video ID inside the product.

## Context

The backend is Django REST Framework under `backend/api`. Token authentication is already used, and playlist/video ownership is enforced by filtering `Playlist` rows by `request.user`.

Current data model:

- `backend/api/models.py` has `Playlist(user, youtube_playlist_id, title, channel_title, thumbnail_url, description, published_at, video_count, source, is_unlinked)` with a unique constraint on `(user, youtube_playlist_id)`.
- `backend/api/models.py` has `Video(playlist, youtube_video_id, position, title, channel_title, duration, thumbnail_url, published_at, view_count, is_removed)` with a unique constraint on `(playlist, youtube_video_id)`.
- `backend/api/models.py` has `Note(user, youtube_video_id, content)` keyed per user and YouTube video ID. Since this iteration imports YouTube video URLs only, notes can keep using YouTube video IDs.

Current backend behavior:

- `backend/api/views.py` exposes `/api/playlists/`, `/api/playlists/<id>/`, `/api/playlists/import/`, `/api/playlists/<id>/refresh/`, `/api/playlists/<id>/unlink/`, and note endpoints.
- `playlist_list` and `playlist_detail` exclude `is_unlinked=True`.
- `playlist_import` imports public YouTube playlist URLs through `api.youtube.import_playlist_for_user`.
- `playlist_refresh` refreshes `source="url"` through public YouTube playlist URL import and all other sources through OAuth refresh. This must not run for personal playlists.
- `playlist_unlink` soft-unlinks a playlist for the current user.
- `api.youtube.py` already has `_fetch_video_details(video_ids: list[str])`, `_parse_iso_duration(duration_str: str)`, and `_iso_to_datetime(iso_str: str | None)` helpers that can be reused for YouTube video metadata.
- `api.youtube.extract_playlist_id` validates playlist URLs only. A separate video-ID extraction helper is needed.
- `backend/api/tests.py` already uses `APITestCase`, DRF token auth headers, and `unittest.mock.patch` for API and YouTube service coverage.

Current frontend behavior:

- `frontend/src/pages/PlaylistBrowser.tsx` lists playlists, imports public YouTube playlist URLs, manages YouTube OAuth import, refreshes playlists, and unlinks playlists.
- `frontend/src/pages/PlaylistDetail.tsx` displays a playlist, auto-selects the first video, renders `YouTubePlayer`, renders `MarkdownNotes`, and lists videos through `VideoListItem`.
- `frontend/src/components/YouTubePlayer.tsx` already accepts an `initialVideoId` and embeds `https://www.youtube.com/embed/<id>`.
- `frontend/src/components/VideoListItem.tsx` uses `video.youtubeVideoId` for selection, standalone watch navigation, and removed-video display.
- `frontend/src/components/PlaylistCard.tsx` currently displays source badges for `source === "url"` and `source === "oauth"` only.
- `frontend/src/types/playlist.ts` has `source: 'url' | 'oauth' | string`.
- `frontend/src/api/playlists.ts` normalizes snake_case responses to camelCase and is the right place for new playlist API calls.

Architectural constraint:

- The app is currently YouTube-video based. The new playlist must not imply support for arbitrary video hosts or direct media files in this iteration.
- Keep existing public YouTube playlist import and OAuth playlist import behavior intact.

## Assumptions

- Each authenticated user gets exactly one visible personal playlist.
- The personal playlist is created lazily the first time the playlist list is requested, or the first time a user imports a personal video, whichever happens first.
- The personal playlist uses `source="personal"`.
- The personal playlist's `youtube_playlist_id` should be a deterministic internal sentinel per user, such as `personal:<user_id>`, to satisfy the existing unique constraint without representing a real YouTube playlist.
- The personal playlist should be titled `My Playlist`.
- Users import YouTube video URLs or raw 11-character YouTube video IDs into the personal playlist.
- Importing an already-present video into the same personal playlist should not create a duplicate. It should update metadata if fetched successfully and return the playlist detail with HTTP 200.
- Importing a new video should append it at the end of the personal playlist and return the playlist detail with HTTP 201.
- Personal playlist videos use existing `Video.youtube_video_id`, `MarkdownNotes`, and `YouTubePlayer` behavior.

## Open Questions

None.

## Files To Modify

- `backend/api/models.py`
  - Add model-level constants if useful, such as `Playlist.SOURCE_URL = "url"`, `Playlist.SOURCE_OAUTH = "oauth"`, and `Playlist.SOURCE_PERSONAL = "personal"`.
  - Do not rename existing database columns in this iteration.
  - Expected behavior: code can distinguish personal playlists from YouTube-linked playlists without string literals scattered everywhere.

- `backend/api/serializers.py`
  - Add `PersonalVideoImportSerializer` accepting `url`.
  - Keep existing `PlaylistSerializer`, `PlaylistDetailSerializer`, and `VideoSerializer` response shapes compatible.
  - Expected behavior: the new import endpoint validates a non-blank submitted video URL or ID.

- `backend/api/youtube.py`
  - Add a YouTube video ID extraction helper for single-video URLs and raw IDs.
  - Add a metadata helper that imports/appends one video into the current user's personal playlist.
  - Reuse `_fetch_video_details`, `_parse_iso_duration`, and `_iso_to_datetime` instead of duplicating YouTube API parsing.
  - Expected behavior: personal video import fetches metadata from YouTube Data API, creates or updates one `Video` row under the user's personal playlist, and keeps playlist `video_count` accurate.

- `backend/api/views.py`
  - Ensure `playlist_list` creates the current user's personal playlist before returning visible playlists.
  - Add a new authenticated view for importing a video URL into the personal playlist.
  - Update `playlist_refresh` so personal playlists return a clear 400 response instead of attempting OAuth refresh.
  - Expected behavior: every authenticated user sees their own personal playlist; video imports are user-scoped; personal playlists are not refreshed from YouTube as playlists.

- `backend/api/urls.py`
  - Add a new route for the personal video import endpoint.
  - Expected route: `POST /api/playlists/personal/videos/import/`.

- `backend/api/tests.py`
  - Add focused backend tests for personal playlist creation, user scoping, video import, duplicate import, invalid URL validation, auth requirements, and refresh rejection.
  - Use existing test style and `patch("api.youtube._fetch_video_details")` where possible.

- `frontend/src/types/playlist.ts`
  - Include `personal` as a known playlist source.
  - Add a response type if useful for the new import call; otherwise reuse `PlaylistDetail`.

- `frontend/src/api/playlists.ts`
  - Add `importPersonalVideo(token: string, url: string): Promise<PlaylistDetail>`.
  - Keep the existing `importPlaylist` public playlist import unchanged.

- `frontend/src/components/PlaylistCard.tsx`
  - Add a badge for `source === "personal"`.
  - Hide or disable refresh UI for personal playlists if the card receives an `onRefresh` prop.
  - Expected behavior: personal playlists are visually distinct and do not expose a refresh action that cannot work.

- `frontend/src/pages/PlaylistBrowser.tsx`
  - Update copy to distinguish public YouTube playlist URL import from personal video URL import.
  - Add a small form for adding a YouTube video URL or video ID to the personal playlist.
  - After successful import, refresh the playlist list.
  - Do not couple this feature to YouTube OAuth connection state.
  - Prevent refresh attempts for personal playlists from the card menu.

- `frontend/src/pages/PlaylistDetail.tsx`
  - Hide or disable the refresh button for `source === "personal"`.
  - Keep `YouTubePlayer`, `MarkdownNotes`, and video selection behavior unchanged for personal videos.
  - Expected behavior: the personal playlist detail behaves like other playlist detail pages except it cannot be refreshed from a source playlist.

## Files To Add

- `backend/api/migrations/0009_personal_playlist_source.py`
  - Purpose: introduce any model metadata needed for the personal playlist source.
  - Expected operations:
    - If `models.py` only adds constants, this migration may be empty and should not be created.
    - If Agent B changes a field definition, add the generated migration.
  - Do not rename `youtube_playlist_id` or `youtube_video_id` in this migration.

No frontend files should be added unless Agent B chooses to extract a small local component from `PlaylistBrowser.tsx` to keep the page readable. Prefer modifying existing files first.

## Do Not Touch

- Do not rename existing database columns such as `youtube_playlist_id`, `youtube_video_id`, or `source`.
- Do not remove, rewrite, or change the response shape of existing `/api/playlists/import/`, `/api/youtube/*`, `/api/notes/<video_id>/`, or auth endpoints.
- Do not change YouTube OAuth token storage, encryption, OAuth scopes, callback handling, or disconnect semantics.
- Do not add support for arbitrary direct video URLs, file uploads, Vimeo, non-YouTube iframes, or custom media playback.
- Do not change note identity away from YouTube video ID in this iteration.
- Do not delete playlist or video rows as part of personal playlist import.
- Do not refactor `PlaylistBrowser.tsx` broadly beyond what is required for the new personal video import UI.
- Do not update dependencies unless an existing dependency is insufficient, which is not expected.
- Do not change CORS, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, or production settings.

## Function Signatures And Interfaces

Backend helpers in `backend/api/youtube.py`:

```python
def extract_video_id(url_or_id: str) -> str:
    """Return an 11-character YouTube video ID or raise PlaylistImportError."""
```

Validation behavior:

- Reject blank input with `PlaylistImportError("No URL provided.")` or similarly clear wording.
- Accept raw IDs matching `^[a-zA-Z0-9_-]{11}$`.
- Accept YouTube watch URLs with `?v=...`.
- Accept `youtu.be/<id>` short URLs.
- Accept YouTube Shorts URLs such as `/shorts/<id>` if straightforward to support.
- Reject playlist-only URLs without a video ID.
- Reject non-YouTube URLs.

```python
def get_or_create_personal_playlist_for_user(user: User) -> Playlist:
    """Return the user's visible personal playlist, creating it if missing."""
```

Expected behavior:

- Uses `Playlist.objects.get_or_create(user=user, youtube_playlist_id=f"personal:{user.id}", defaults={...})`.
- Defaults include `title="My Playlist"`, `channel_title=""` or `"Personal"`, `description=""`, `thumbnail_url=""`, `video_count=0`, `source="personal"`, and `is_unlinked=False`.
- If an existing personal playlist is `is_unlinked=True`, set `is_unlinked=False` so the built-in playlist remains visible.
- The function must not return another user's playlist.

```python
def import_personal_video_for_user(user: User, url_or_id: str) -> tuple[Playlist, bool]:
    """Import one YouTube video into the user's personal playlist.

    Returns (playlist, created), where created is True only when a new Video row
    was appended to the personal playlist.
    """
```

Expected behavior:

- Extract the video ID with `extract_video_id`.
- Fetch metadata with `_fetch_video_details([video_id])`.
- If no details are returned for the video ID, raise `YouTubeAPIError("Video not found on YouTube. It may have been deleted or made private.")` or equivalent.
- Use a database transaction.
- Create the personal playlist if needed.
- Append new videos at `max(existing.position) + 1`, using `0` for the first video.
- Update existing video metadata when the video already exists.
- Set `is_removed=False` for imported or re-imported personal videos.
- Set `playlist.thumbnail_url` from the first active video thumbnail when the personal playlist has no thumbnail.
- Set `playlist.video_count` to the count of videos in that personal playlist, including removed rows unless Agent B finds existing code consistently counts only active rows. Be consistent and document the choice in tests.

Backend serializer in `backend/api/serializers.py`:

```python
class PersonalVideoImportSerializer(serializers.Serializer):
    url = serializers.CharField(required=True, allow_blank=False)
```

Backend view in `backend/api/views.py`:

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def personal_video_import(request):
    ...
```

Response behavior:

- Request body: `{ "url": "<youtube video url or id>" }`.
- Success response: `PlaylistDetailSerializer(personal_playlist).data`.
- Status: `201 Created` when a new video row was added, `200 OK` when an existing video was updated.
- Invalid submitted URL or ID: `400 Bad Request` with `{ "url": submitted_value, "detail": "..." }`.
- YouTube API failure: `502 Bad Gateway` with `{ "url": submitted_value, "detail": "..." }`.
- Auth required: DRF token auth returns `401 Unauthorized`.

Backend route in `backend/api/urls.py`:

```python
path(
    "playlists/personal/videos/import/",
    views.personal_video_import,
    name="personal-video-import",
)
```

Frontend API in `frontend/src/api/playlists.ts`:

```ts
export function importPersonalVideo(
  token: string,
  url: string,
): Promise<PlaylistDetail>
```

Request body:

```json
{ "url": "<youtube video url or id>" }
```

Frontend type in `frontend/src/types/playlist.ts`:

```ts
source: 'url' | 'oauth' | 'personal' | string
```

UI behavior:

- `PlaylistBrowser` has separate controls for:
  - importing a public YouTube playlist URL through existing `importPlaylist`
  - adding a YouTube video URL or ID to `My Playlist` through `importPersonalVideo`
- Personal playlist refresh is not shown in menus or detail header.
- The personal playlist can still be unlinked only if Agent B keeps existing generic unlink behavior exposed. The built-in playlist should reappear on next list load because `get_or_create_personal_playlist_for_user` restores visibility.

## Implementation Steps

1. Add source constants to `Playlist` in `backend/api/models.py`, or at minimum use a single module-level constant for `"personal"` in backend code.
2. In `backend/api/youtube.py`, implement `extract_video_id`, `get_or_create_personal_playlist_for_user`, and `import_personal_video_for_user`.
3. In `backend/api/serializers.py`, add `PersonalVideoImportSerializer`.
4. In `backend/api/views.py`, import the new serializer and helper. Update `playlist_list` to call `get_or_create_personal_playlist_for_user(request.user)` before querying playlists.
5. In `backend/api/views.py`, add `personal_video_import` with the response and error behavior specified above.
6. In `backend/api/views.py`, update `playlist_refresh` to return `400 Bad Request` with a clear message when `playlist.source == "personal"`.
7. In `backend/api/urls.py`, register `POST /api/playlists/personal/videos/import/`.
8. Run `python backend/manage.py makemigrations api` only if model field definitions changed. Do not create a migration for constants-only changes.
9. Add backend tests in `backend/api/tests.py`.
10. Update `frontend/src/types/playlist.ts` to include `personal`.
11. Add `importPersonalVideo` in `frontend/src/api/playlists.ts`.
12. Update `PlaylistCard` to render a personal source badge and suppress the refresh action for personal playlists.
13. Update `PlaylistBrowser` to add the personal video import form, state, loading/error display, and post-success playlist refresh.
14. Update `PlaylistBrowser` refresh handling so it does not call `refreshPlaylist` for `source === "personal"`.
15. Update `PlaylistDetail` to hide the refresh button for `source === "personal"`.
16. Run backend tests and frontend lint/build commands listed below.

## Acceptance Criteria

- An authenticated user who has no playlists sees a `My Playlist` personal playlist in `GET /api/playlists/`.
- The personal playlist has `source="personal"` and is not backed by a real YouTube playlist ID.
- A user can submit a YouTube video URL or raw video ID and have that video appended to their personal playlist.
- The personal video import endpoint returns the full personal playlist detail with videos.
- Re-importing the same video into the same personal playlist does not create a duplicate row.
- Two different users can import the same video into separate personal playlists without sharing playlist rows.
- Public YouTube playlist URL import still creates `source="url"` playlists through `/api/playlists/import/`.
- YouTube OAuth playlist import and disconnect behavior still works and still uses `source="oauth"`.
- Personal playlists do not attempt playlist refresh and show a clear unsupported message if the backend refresh endpoint is called.
- Frontend shows a distinct personal playlist badge.
- Frontend has a way to add a YouTube video URL or ID to `My Playlist` without requiring YouTube OAuth connection.
- Notes and playback continue to work for personal playlist videos through existing YouTube video IDs.

## Testing Requirements

Backend tests in `backend/api/tests.py`:

- Add `PersonalPlaylistTests` or similarly named `APITestCase`.
- Unit/integration test: authenticated `GET /api/playlists/` creates and returns one personal playlist for a new user.
  - Assert status `200`.
  - Assert a playlist with `source == "personal"` and `title == "My Playlist"` exists for that user.
  - Assert a second list call does not create another personal playlist.
- Integration test: unauthenticated `POST /api/playlists/personal/videos/import/` returns `401`.
- Integration test: valid YouTube video URL imports one video.
  - Patch `api.youtube._fetch_video_details`.
  - POST `{ "url": "https://www.youtube.com/watch?v=vid00000001" }`.
  - Assert status `201`, response `source == "personal"`, and response includes one video with `youtube_video_id == "vid00000001"`.
  - Assert the database has one `Playlist` for the user with `source="personal"` and one `Video`.
- Integration test: duplicate import updates existing video and returns `200`.
  - Import once, then import the same URL again with changed mocked title.
  - Assert only one `Video` row exists under the personal playlist.
  - Assert metadata updated.
- Integration test: two users can import the same video into separate personal playlists.
  - Assert separate playlist IDs and user ownership.
- Integration test: invalid URL returns `400` and includes the submitted URL and `detail`.
- Integration test: refreshing a personal playlist returns `400` with a clear detail message and does not call YouTube playlist/OAuth refresh helpers.

Commands:

```powershell
cd backend
python manage.py test api
```

Expected result: all backend tests pass.

Frontend checks:

```powershell
cd frontend
npm run lint
npm run build
```

Expected result: lint and build pass.

Out of scope tests:

- No browser end-to-end test is required for this iteration.
- No snapshot tests.
- No tests for arbitrary non-YouTube video hosts.

## Edge Cases

- Blank import input.
- Raw 11-character YouTube video ID.
- Standard watch URL with extra query parameters.
- `youtu.be/<id>` short URL.
- YouTube Shorts URL if implemented.
- Playlist URL without a `v` parameter should be rejected for personal video import.
- Non-YouTube URL should be rejected.
- Video not returned by YouTube Data API should produce a user-friendly 502.
- Existing unlinked personal playlist should be restored by list/import because the personal playlist is built in.
- Existing personal playlist with no videos should render without player errors.
- Existing video reimport should not change its playlist position.

## Risks

- The model currently names IDs as `youtube_playlist_id` and `youtube_video_id`; personal playlists require an internal sentinel playlist ID, which is conceptually awkward but avoids a broad migration.
- `playlist_refresh` currently treats every non-`url` source as OAuth. Missing the personal guard would route personal playlists into OAuth refresh and fail incorrectly.
- `playlist_list` creating a row on read is convenient but introduces a side effect on GET. This is acceptable for a built-in per-user playlist but should be tested for idempotency.
- Frontend copy currently frames the app around playlist URLs. Ambiguous copy could make users paste video URLs into the public playlist import form.
- YouTube Data API quota errors can affect personal video import because metadata is fetched from YouTube even though the playlist itself is app-owned.

## Out Of Scope

- Arbitrary video hosting support.
- Uploading videos.
- Reordering videos in the personal playlist.
- Removing individual videos from the personal playlist.
- Editing personal playlist title or thumbnail.
- Migrating schema names away from YouTube-specific column names.
- Changing note identity or adding non-YouTube note keys.
- Automatic synchronization of personal playlist videos.
- Hidden playlists page or restore/unhide feature.

## Done Definition

- Plan constraints above are followed without broad refactors.
- Backend helper, serializer, view, route, and tests for personal video import are complete.
- Personal playlist is created idempotently per user and remains user-scoped.
- Existing public playlist import and OAuth tests still pass.
- Frontend exposes a clear personal video import control.
- Personal playlist refresh is hidden/blocked.
- `python manage.py test api` passes from `backend`.
- `npm run lint` and `npm run build` pass from `frontend`.
- No secrets, tokens, local databases, generated build output, or dependency directories are committed.
