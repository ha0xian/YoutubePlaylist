# Plan: Removed Video Persistence UI

## Goal

Persist videos that disappear from a source YouTube playlist by marking them as removed, expose that state through the playlist detail API, and render user-facing removed indicators in the playlist video UI and watch surfaces.

## Context

The backend is a Django 6 / Django REST Framework app under `backend/`. The frontend is a Vite React / TypeScript app under `frontend/`.

Relevant backend findings:

- `backend/api/models.py` defines `Playlist` and `Video`. `Video` currently has playlist, YouTube ID, metadata, timestamps, and ordering, but no active `is_removed` field.
- `backend/api/migrations/0004_fix_video_columns.py` explicitly dropped stale `is_deleted` and `is_removed` columns if present. A new migration must reintroduce only the intended active `is_removed` field.
- `backend/api/serializers.py` has `VideoSerializer`, nested in `PlaylistDetailSerializer`. It does not expose `is_removed`.
- `backend/api/youtube.py::import_playlist_for_user` currently calls `playlist.videos.all().delete()` before recreating videos on URL reimport. This loses rows for removed source videos.
- `backend/api/youtube_oauth.py::_persist_oauth_playlist`, `import_oauth_playlists_for_user`, and URL-preserving OAuth paths also delete and recreate videos.
- Existing backend tests live in `backend/api/tests.py`. Import tests already mock YouTube responses and verify playlist/video creation and reimport behavior. Playlist detail tests verify auth scoping.

Relevant frontend findings:

- `frontend/src/types/playlist.ts` defines `Video`, `Playlist`, and `PlaylistDetail`; `Video` has no `isRemoved`.
- `frontend/src/api/playlists.ts` normalizes snake_case API keys to camelCase recursively, so serializer field `is_removed` becomes `isRemoved`.
- `frontend/src/components/VideoListItem.tsx` renders thumbnail, duration, title, channel, views, selected state, and navigates to `/watch/:videoId` when no `onSelect` handler is provided.
- `frontend/src/pages/PlaylistDetail.tsx` loads a playlist detail, selects the first video by default, embeds `YouTubePlayer`, renders `MarkdownNotes`, and maps videos through `VideoListItem`.
- `frontend/src/pages/WatchPage.tsx` only receives `videoId` from the route and does not currently know playlist/video metadata.
- `frontend/src/components/YouTubePlayer.tsx` accepts only `initialVideoId`; warning UI should live in pages/components around it rather than inside the generic player unless a prop is added deliberately.

Product requirements in `docs/project-requirements.md` state that videos deleted from the source YouTube playlist remain in the app, are visually marked, remain clickable/watchable, and use the user-facing label `removed`.

## Assumptions

- `is_removed=False` means the video is currently present in the latest imported source playlist snapshot.
- `is_removed=True` means the video existed locally but was missing from the latest imported source playlist snapshot.
- Reimporting a playlist should revive a previously removed video by setting `is_removed=False` and updating metadata/position when the video reappears.
- Removed videos remain in `PlaylistDetail.videos` and keep their existing YouTube ID, notes behavior, and watchability.
- `Playlist.video_count` should continue to reflect YouTube's reported current item count, not the total local rows including removed videos.
- The frontend should render the label exactly as `removed`.
- No new public endpoint is required for direct `/watch/:videoId` lookups in this scope. Standalone watch warnings should use router state when a `VideoListItem` navigates to the watch page; playlist detail should render its own warning for the selected removed video.

## Open Questions

None.

## Files To Modify

- Path: `backend/api/models.py`
  - Purpose of change: Add active removed-video persistence to the `Video` model.
  - Specific changes: Add `is_removed = models.BooleanField(default=False)` to `Video`.
  - Expected behavior: Video rows can persist after source removal and can be queried/serialized with their removed state.

- Path: `backend/api/serializers.py`
  - Purpose of change: Expose removed status through the existing playlist detail response.
  - Specific changes: Add `"is_removed"` to `VideoSerializer.Meta.fields`.
  - Expected behavior: `GET /api/playlists/<id>/` and playlist import responses include `videos[].is_removed`.

- Path: `backend/api/youtube.py`
  - Purpose of change: Replace delete/recreate URL import behavior with reconciliation.
  - Specific changes: Add a helper for reconciling a playlist's video rows from `item_video_map` and `video_details`; use it in `import_playlist_for_user`.
  - Expected behavior: URL reimport updates current videos, creates new videos, marks missing existing videos removed, and revives videos that reappear.

- Path: `backend/api/youtube_oauth.py`
  - Purpose of change: Apply the same removed-video reconciliation to OAuth playlist import paths.
  - Specific changes: Import and use the shared video reconciliation helper from `backend/api/youtube.py`; remove direct `playlist.videos.all().delete()` calls in OAuth import/update paths that refresh playlist videos.
  - Expected behavior: OAuth selected imports and full OAuth imports preserve missing videos as removed instead of deleting them.

- Path: `backend/api/tests.py`
  - Purpose of change: Add focused backend coverage for persistence, serializer exposure, and revival behavior.
  - Specific changes: Extend existing import/detail tests with minimal cases for `is_removed`; add OAuth import coverage where stale rows are marked removed.
  - Expected behavior: Tests prove removed rows survive reimport, appear in API output, and become active again when present in a later import.

- Path: `frontend/src/types/playlist.ts`
  - Purpose of change: Reflect the backend API contract in TypeScript.
  - Specific changes: Add `isRemoved: boolean` to `Video`.
  - Expected behavior: Components can type-safely render removed state.

- Path: `frontend/src/components/VideoListItem.tsx`
  - Purpose of change: Render removed-video visual treatment.
  - Specific changes: Add removed badge, dimmed styling, and route state when navigating to `/watch/:videoId` without an `onSelect` handler.
  - Expected behavior: Removed videos show a `removed` badge, appear visually subdued, remain clickable/selectable, and pass removed status to the standalone watch page when navigated from the item.

- Path: `frontend/src/pages/PlaylistDetail.tsx`
  - Purpose of change: Show a warning when the selected playlist video is removed.
  - Specific changes: Derive `effectiveVideo` from `effectiveVideoId`; render a warning near the player/notes area when `effectiveVideo?.isRemoved` is true.
  - Expected behavior: Selecting a removed video in playlist detail keeps the player and notes available while warning the user that the video was removed from the source playlist.

- Path: `frontend/src/pages/WatchPage.tsx`
  - Purpose of change: Show a warning on standalone watch page when removed status was provided by navigation.
  - Specific changes: Read `location.state?.isRemoved === true`; render the same warning copy when true.
  - Expected behavior: Navigating to `/watch/:videoId` from a removed `VideoListItem` displays the removed warning without changing direct URL behavior.

## Files To Add

- Path: `backend/api/migrations/0007_video_is_removed.py`
  - Purpose: Add the active `Video.is_removed` database column.
  - Expected exports, functions, classes, components, fixtures, or tests: Django migration with `migrations.AddField(model_name="video", name="is_removed", field=models.BooleanField(default=False))`.

## Do Not Touch

- Do not change authentication, token storage, OAuth encryption, or permission classes.
- Do not change public API response shapes except adding `videos[].is_removed` to existing video serializer output.
- Do not delete or rename existing playlist, video, note, or OAuth endpoints.
- Do not alter note persistence or markdown rendering.
- Do not change `Playlist.video_count` semantics.
- Do not delete OAuth playlists differently from the existing disconnect and selected-import behavior.
- Do not update dependencies or package manager files.
- Do not refactor unrelated UI layout, playlist browser behavior, auth pages, or YouTube player parsing.
- Do not modify generated build output, `node_modules/`, local database files, virtualenvs, or screenshots.

## Function Signatures And Interfaces

- Model field:
  - `Video.is_removed: bool`
  - Default: `False`
  - Validation: standard Django boolean field validation.
  - Side effects: requires migration; existing rows get `False`.

- Serializer field:
  - `VideoSerializer` output adds:
    ```json
    {
      "is_removed": false
    }
    ```
  - Existing snake_case API fields remain unchanged.
  - Frontend normalization converts this to `isRemoved`.

- Shared backend helper:
  - Add in `backend/api/youtube.py`:
    ```python
    def reconcile_playlist_videos(
        playlist: Playlist,
        item_video_map: dict[int, dict],
        video_details: dict[str, dict],
    ) -> None:
    ```
  - Parameters:
    - `playlist`: local `Playlist` row whose videos are being refreshed.
    - `item_video_map`: position-keyed payloads containing at least `video_id`, `title`, `channel_title`, `thumbnail_url`, and `published_at`.
    - `video_details`: YouTube videos API detail payload keyed by YouTube video ID.
  - Return type: `None`.
  - Behavior:
    - Determine incoming YouTube video IDs from `item_video_map`.
    - For each incoming video, update or create the row by `(playlist, youtube_video_id)`.
    - Set `is_removed=False` on every incoming row.
    - Update position, title, channel title, duration, thumbnail URL, published date, view count, and `updated_at` for incoming rows.
    - After incoming rows are processed, mark existing rows for the playlist whose `youtube_video_id` is not in the incoming set as `is_removed=True`.
    - If `item_video_map` is empty, mark all existing videos in the playlist as `is_removed=True`.
    - Do not delete video rows.
  - Error behavior:
    - Preserve existing parsing fallbacks for missing details.
    - Let unexpected database errors propagate inside the caller's transaction.

- Frontend type:
  - Modify `Video` in `frontend/src/types/playlist.ts`:
    ```ts
    isRemoved: boolean
    ```

- `VideoListItem` behavior:
  - Existing props remain:
    ```ts
    interface VideoListItemProps {
      video: Video
      isSelected?: boolean
      onSelect?: (video: Video) => void
    }
    ```
  - When `video.isRemoved` is true:
    - Render a visible badge with text `removed`.
    - Apply dimmed styling to thumbnail/text while preserving readability.
    - Keep click behavior unchanged.
    - In the navigate fallback, call:
      ```ts
      navigate(`/watch/${video.youtubeVideoId}`, {
        state: { isRemoved: video.isRemoved },
      })
      ```

- `PlaylistDetail` selected video derivation:
  - Add a derived value equivalent to:
    ```ts
    const effectiveVideo =
      playlist?.videos.find((v) => v.youtubeVideoId === effectiveVideoId) ?? null
    ```
  - Warning behavior:
    - Render warning only when `effectiveVideo?.isRemoved` is true.
    - Warning copy must include the user-facing label `removed`.

- `WatchPage` route-state handling:
  - Use React Router's `useLocation`.
  - Treat removed state as true only for:
    ```ts
    (location.state as { isRemoved?: boolean } | null)?.isRemoved === true
    ```
  - Do not make new backend calls from `WatchPage`.

## Implementation Steps

1. Add `Video.is_removed = models.BooleanField(default=False)` to `backend/api/models.py`.
2. Create `backend/api/migrations/0007_video_is_removed.py` with an `AddField` migration.
3. Add `"is_removed"` to `VideoSerializer.Meta.fields` in `backend/api/serializers.py`.
4. In `backend/api/youtube.py`, extract the existing video row creation payload logic into `reconcile_playlist_videos`.
5. Replace `playlist.videos.all().delete()` and recreate loop in `import_playlist_for_user` with `reconcile_playlist_videos(playlist, item_video_map, video_details)`.
6. In `backend/api/youtube_oauth.py`, import `reconcile_playlist_videos` from `.youtube`.
7. Replace delete/recreate calls in `_persist_oauth_playlist`, `import_oauth_playlists_for_user` URL-preserving branch, and `import_oauth_playlists_for_user` OAuth branch with `reconcile_playlist_videos`.
8. Keep selected OAuth playlist deletion behavior unchanged for unchecked OAuth playlists.
9. Update backend tests:
   - URL reimport marks missing videos removed.
   - URL reimport revives a previously removed video when it reappears.
   - Playlist detail serializer includes `is_removed`.
   - OAuth selected import marks stale videos removed for refreshed playlists.
10. Add `isRemoved` to the frontend `Video` type.
11. Update `VideoListItem` to render removed badge/dimmed styling while preserving selection/click behavior.
12. Update `PlaylistDetail` to derive the selected `Video` object and render a removed warning when selected video is removed.
13. Update `WatchPage` to read router state and render the removed warning when `isRemoved` is true.
14. Run the focused backend tests.
15. Run frontend lint/build checks.

## Acceptance Criteria

- Existing video rows are not deleted when a playlist is reimported and a video is missing from the latest YouTube playlist items.
- Missing existing videos are marked `is_removed=True`.
- Current/imported videos are saved with `is_removed=False`.
- Previously removed videos are revived to `is_removed=False` when they reappear.
- `GET /api/playlists/<id>/` includes `is_removed` for every nested video.
- Frontend playlist detail data normalizes `is_removed` to `isRemoved`.
- Removed videos show a visible `removed` badge in video lists.
- Removed videos are visually dimmed but remain readable and clickable.
- Selecting a removed video in playlist detail keeps the player and notes available and shows a warning.
- Navigating to standalone watch from a removed video list item shows a warning on the watch page.
- Direct `/watch/:videoId` visits still work and do not require a backend lookup.
- Auth scoping for playlist detail remains unchanged.
- OAuth disconnect and selected playlist removal behavior remains unchanged.

## Testing Requirements

- Test file to modify: `backend/api/tests.py`
  - Test case: URL reimport marks stale videos removed.
  - Type: integration-style API test using existing mocked YouTube API helpers.
  - Assertion: after first import with two videos and second import with only one video, the missing video row still exists with `is_removed=True`; the remaining video has `is_removed=False`; the response includes both local videos or at minimum the detail endpoint includes both with correct flags.
  - Command: from `backend/`, run `.\.venv\Scripts\python.exe manage.py test api.tests.PlaylistImportSuccessTests`.
  - Expected result: tests pass.

- Test file to modify: `backend/api/tests.py`
  - Test case: URL reimport revives a removed video.
  - Type: integration-style API test using existing mocked YouTube API helpers.
  - Assertion: a video marked removed by one reimport becomes `is_removed=False` after a later reimport includes it again.
  - Command: from `backend/`, run `.\.venv\Scripts\python.exe manage.py test api.tests.PlaylistImportSuccessTests`.
  - Expected result: tests pass.

- Test file to modify: `backend/api/tests.py`
  - Test case: playlist detail serializes removed status.
  - Type: API integration test.
  - Assertion: nested `videos[]` entries include `is_removed` with the database value.
  - Command: from `backend/`, run `.\.venv\Scripts\python.exe manage.py test api.tests.PlaylistDetailTests`.
  - Expected result: tests pass.

- Test file to modify: `backend/api/tests.py`
  - Test case: selected OAuth import marks stale refreshed playlist videos removed.
  - Type: API integration test with existing OAuth mock session pattern.
  - Assertion: an existing video for a refreshed selected playlist that is missing from mocked remote items remains in the database with `is_removed=True`; incoming mocked videos are `False`.
  - Command: from `backend/`, run the OAuth import test class that contains selected playlist import tests.
  - Expected result: tests pass.

- Frontend checks:
  - Test files to add or modify: none; no frontend test runner is configured in `frontend/package.json`.
  - Commands: from `frontend/`, run `npm run lint` and `npm run build`.
  - Expected result: both commands pass.

- Tests intentionally out of scope:
  - End-to-end browser tests.
  - Snapshot tests.
  - Broad OAuth token refresh or disconnect test rewrites.
  - New frontend component test infrastructure.

## Edge Cases

- Reimport returns an empty playlist item list: all existing videos for that playlist should be marked removed, not deleted.
- A removed video reappears at a different position: update position and set `is_removed=False`.
- YouTube videos API omits details for a playlist item: preserve existing fallback behavior from playlist item metadata and still set `is_removed=False` for incoming rows.
- Duplicate incoming video IDs should not create duplicate rows; the unique `(playlist, youtube_video_id)` constraint remains authoritative.
- Existing users with video rows before the migration should get `is_removed=False`.
- A video can be removed in one playlist and active in another playlist because removed state is per `Video` row, not global per YouTube ID.
- Direct `/watch/:videoId` cannot know removed state without route state; it should continue rendering normally.

## Risks

- Replacing delete/recreate behavior may expose ordering assumptions in code that expected only current YouTube playlist items. Keep serializer ordering through `Video.Meta.ordering`.
- Reconciliation must be inside existing transactions so playlist metadata and video removed flags cannot partially update.
- `bulk update` for removed rows must avoid marking incoming rows removed due to duplicate or malformed incoming IDs.
- Adding `is_removed` changes API output by adding a field; frontend normalization should handle it, but tests should protect the contract.
- Existing migration `0004_fix_video_columns.py` previously dropped `is_removed`; the new migration must be clearly separate and should not edit old migrations.
- The watch page warning based on route state does not cover direct URL entry; adding a backend lookup would be a broader API design decision and is out of scope.

## Out Of Scope

- Adding a new video detail API endpoint.
- Fetching live YouTube availability when opening a removed video.
- Hiding removed videos or adding filters.
- Changing notes behavior for removed videos.
- Changing playlist counts to include removed local rows.
- Redesigning the playlist detail layout.
- Changing OAuth scopes, token refresh, encryption, or disconnect semantics.
- Updating dependencies or adding frontend test libraries.

## Done Definition

- `Video.is_removed` field and migration are present.
- URL and OAuth imports reconcile videos without deleting stale rows.
- Serializer exposes `is_removed`.
- Backend tests cover stale marking, revival, and serializer output.
- Frontend `Video` type includes `isRemoved`.
- `VideoListItem`, `PlaylistDetail`, and `WatchPage` render removed state/warnings as specified.
- Removed videos remain selectable/watchable and notes continue to load by YouTube video ID.
- Focused backend tests pass.
- `npm run lint` and `npm run build` pass in `frontend/`.
- No unrelated files, generated assets, dependencies, auth behavior, or token handling are changed.
