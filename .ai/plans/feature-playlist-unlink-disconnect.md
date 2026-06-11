# Plan: Playlist Unlink Disconnect

## Goal

Add playlist-level unlink behavior so users can remove both URL-imported and OAuth-imported playlists from their visible collection without deleting cached playlist/video data, and update YouTube disconnect/selection flows to preserve cached OAuth playlist rows while removing them from the user view.

## Context

The backend is a Django 6 / Django REST Framework app under `backend/`. The frontend is a Vite React / TypeScript app under `frontend/`.

Relevant backend findings:

- `backend/api/models.py` defines `Playlist` with `user`, `youtube_playlist_id`, metadata, `source`, and timestamps. There is no active hidden/unlinked field.
- `backend/api/migrations/0003_drop_stale_columns.py` deliberately dropped stale `is_deleted`, `is_hidden`, and `is_unlinked` columns. A new migration must reintroduce only the intended active unlink field.
- `backend/api/models.py` has a uniqueness constraint on `["user", "youtube_playlist_id"]`, so a soft unlink field can preserve cached rows and allow future imports to relink/update the same row.
- `backend/api/views.py::playlist_list` currently returns all playlists owned by `request.user`.
- `backend/api/views.py::playlist_detail` and `playlist_refresh` currently allow any playlist owned by `request.user`.
- `backend/api/views.py::youtube_disconnect` currently hard-deletes `source="oauth"` playlists and then deletes the OAuth token row.
- `backend/api/youtube_oauth.py::import_selected_oauth_playlists_for_user` currently hard-deletes unchecked OAuth playlists.
- `backend/api/youtube.py::import_playlist_for_user` uses `Playlist.objects.update_or_create(...)` and can be extended to relink an existing unlinked URL playlist by setting `is_unlinked=False`.
- `backend/api/youtube_oauth.py::_persist_oauth_playlist` uses `update_or_create(...)` for OAuth rows and can be extended to relink selected OAuth playlists by setting `is_unlinked=False`.
- Backend tests live in `backend/api/tests.py` and use DRF `APITestCase`, token auth headers, and direct model assertions.

Relevant frontend findings:

- `frontend/src/api/playlists.ts` wraps playlist list/detail/import/refresh calls with shared `parseJson`, token headers, and snake-to-camel normalization.
- `frontend/src/types/playlist.ts` defines `Playlist` and `PlaylistDetail`; it currently has no unlink state.
- `frontend/src/pages/PlaylistBrowser.tsx` owns playlist list state, URL import state, YouTube OAuth status, remote playlist selection, and OAuth disconnect behavior.
- `frontend/src/components/PlaylistCard.tsx` currently navigates to playlist detail on card click and has no per-card actions.
- `frontend/src/pages/PlaylistDetail.tsx` currently has back, refresh, and user menu controls but no unlink action.
- Frontend scripts are `npm run lint` and `npm run build`. Backend test command is `python manage.py test api`.

## Assumptions

- "Unlink" means the playlist no longer appears in normal playlist list/detail/refresh UI, but the `Playlist` row and related `Video` rows remain in the database for the same user.
- Reimporting the same URL playlist or selecting the same OAuth playlist again should relink the existing cached row by setting `is_unlinked=False` and refreshing metadata/videos.
- YouTube OAuth disconnect should remove OAuth-linked playlists from the user view by setting `is_unlinked=True`, not by deleting cached rows.
- URL-linked playlists remain visible when disconnecting YouTube OAuth.
- Notes are keyed by user and YouTube video ID, not playlist, and must not be deleted or modified by unlink/disconnect.
- A separate hidden playlists page, hide/unhide behavior, and restoration UI are out of scope for this plan.

## Open Questions

None.

## Files To Modify

- Path: `backend/api/models.py`
  - Purpose of change: add active unlink state to `Playlist`.
  - Specific functions, classes, components, routes, schemas, or tests to modify: add `is_unlinked = models.BooleanField(default=False, db_index=True)` to `Playlist`.
  - Expected behavior after modification: playlists can be preserved in the database while excluded from visible user collection queries.

- Path: `backend/api/serializers.py`
  - Purpose of change: expose unlink state consistently where playlist objects are serialized.
  - Specific functions, classes, components, routes, schemas, or tests to modify: add `is_unlinked` to `PlaylistSerializer` and `PlaylistDetailSerializer` fields.
  - Expected behavior after modification: API clients can distinguish linked vs unlinked rows when a response intentionally includes the field. Normal list/detail endpoints should only return linked rows.

- Path: `backend/api/views.py`
  - Purpose of change: make visible playlist endpoints respect unlink state, add per-playlist unlink endpoint, and change OAuth disconnect to soft unlink cached playlists.
  - Specific functions, classes, components, routes, schemas, or tests to modify:
    - `playlist_list`
    - `playlist_detail`
    - `playlist_refresh`
    - new `playlist_unlink`
    - `youtube_disconnect`
  - Expected behavior after modification:
    - `GET /api/playlists/` returns only `user=request.user, is_unlinked=False`.
    - `GET /api/playlists/<id>/` returns 404 for missing, other-user, or unlinked playlists.
    - `POST /api/playlists/<id>/refresh/` returns 404 for missing, other-user, or unlinked playlists.
    - `POST /api/playlists/<id>/unlink/` sets `is_unlinked=True` for the current user's linked playlist and returns a success payload.
    - `POST /api/youtube/disconnect/` deletes only the OAuth token row and sets current user's linked OAuth playlists to `is_unlinked=True`.

- Path: `backend/api/urls.py`
  - Purpose of change: expose the per-playlist unlink route.
  - Specific functions, classes, components, routes, schemas, or tests to modify: add `path("playlists/<int:pk>/unlink/", views.playlist_unlink, name="playlist-unlink")`.
  - Expected behavior after modification: authenticated clients can call the unlink endpoint.

- Path: `backend/api/youtube.py`
  - Purpose of change: relink URL-imported playlists when the same playlist is imported again.
  - Specific functions, classes, components, routes, schemas, or tests to modify: add `"is_unlinked": False` to the `defaults` in `import_playlist_for_user`.
  - Expected behavior after modification: importing a previously unlinked URL playlist updates the existing row and makes it visible again.

- Path: `backend/api/youtube_oauth.py`
  - Purpose of change: relink selected OAuth playlists, treat unlinked local rows as not currently imported in the remote picker, and soft unlink unchecked OAuth playlists.
  - Specific functions, classes, components, routes, schemas, or tests to modify:
    - `list_remote_playlists_for_user`
    - `_persist_oauth_playlist`
    - `import_selected_oauth_playlists_for_user`
    - `import_oauth_playlists_for_user` if still retained as an import path
  - Expected behavior after modification:
    - Remote picker `is_imported` is true only for `is_unlinked=False` local rows.
    - Selecting a remote playlist sets `is_unlinked=False`.
    - Unchecking OAuth playlists sets `is_unlinked=True` instead of deleting rows.

- Path: `backend/api/tests.py`
  - Purpose of change: cover unlink behavior and update delete-based assertions.
  - Specific functions, classes, components, routes, schemas, or tests to modify:
    - add a focused playlist unlink test class
    - update `PlaylistListTests`
    - update `PlaylistDetailTests`
    - update `YouTubeOAuthPlaylistSelectionTests`
    - update `YouTubeOAuthDisconnectTests`
  - Expected behavior after modification: tests prove user scoping, soft unlink preservation, relinking, and disconnect behavior.

- Path: `frontend/src/types/playlist.ts`
  - Purpose of change: include unlink state in playlist types.
  - Specific functions, classes, components, routes, schemas, or tests to modify: add `isUnlinked: boolean` to `Playlist`.
  - Expected behavior after modification: frontend API responses remain typed after serializers add `is_unlinked`.

- Path: `frontend/src/api/playlists.ts`
  - Purpose of change: add an API wrapper for playlist unlink.
  - Specific functions, classes, components, routes, schemas, or tests to modify: add `unlinkPlaylist(token: string, id: string | number): Promise<PlaylistUnlinkResponse>`.
  - Expected behavior after modification: frontend can call `POST /api/playlists/<id>/unlink/` and receive normalized response data.

- Path: `frontend/src/components/PlaylistCard.tsx`
  - Purpose of change: expose a per-playlist unlink control from the playlist grid.
  - Specific functions, classes, components, routes, schemas, or tests to modify:
    - add optional `onUnlink?: (playlist: Playlist) => void`
    - add optional `isUnlinking?: boolean`
    - stop event propagation from the unlink button so it does not navigate
  - Expected behavior after modification: users can unlink a playlist from the browser without opening it.

- Path: `frontend/src/pages/PlaylistBrowser.tsx`
  - Purpose of change: wire playlist unlink state and refresh visible playlists after unlink/disconnect/remote selection changes.
  - Specific functions, classes, components, routes, schemas, or tests to modify:
    - import `unlinkPlaylist`
    - add state for the playlist currently unlinking
    - add `handlePlaylistUnlink`
    - pass unlink props to `PlaylistCard`
    - keep existing OAuth disconnect refresh behavior, now relying on soft-unlinked rows being excluded from `listPlaylists`
  - Expected behavior after modification: unlinking either URL or OAuth playlists removes them from the grid without a page reload and shows errors if the request fails.

- Path: `frontend/src/pages/PlaylistDetail.tsx`
  - Purpose of change: expose unlink from the detail page.
  - Specific functions, classes, components, routes, schemas, or tests to modify:
    - import `unlinkPlaylist`
    - add `isUnlinking` state
    - add `handleUnlink`
    - render an unlink button near the refresh/user controls
  - Expected behavior after modification: unlinking from detail removes the playlist from visible collection and navigates back to `/`.

## Files To Add

- Path: `backend/api/migrations/0008_playlist_is_unlinked.py`
  - Purpose: add the active `Playlist.is_unlinked` column.
  - Expected exports, functions, classes, components, fixtures, or tests:
    - Django migration depending on `("api", "0007_video_is_removed")`.
    - `migrations.AddField(model_name="playlist", name="is_unlinked", field=models.BooleanField(default=False, db_index=True))`.

## Do Not Touch

- Do not delete cached `Playlist` or `Video` rows for unlink, OAuth disconnect, or unchecked OAuth selection.
- Do not change the `Playlist` ownership model or the `unique_user_playlist` constraint.
- Do not change `Note` model behavior or delete notes.
- Do not add hide/unhide or hidden playlist page behavior in this implementation.
- Do not change authentication, token storage, OAuth callback validation, encryption, or OAuth scopes.
- Do not change public playlist/video response field names except adding `is_unlinked`.
- Do not update dependencies.
- Do not refactor unrelated frontend layout, routing, markdown notes, player, or auth code.
- Do not modify production-sensitive Django settings such as `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, or CORS.

## Function Signatures And Interfaces

- Model field:
  - `Playlist.is_unlinked: bool`
  - Default: `False`
  - Indexed: `True`
  - Side effect: existing rows remain linked after migration because default is false.

- Endpoint:
  - `POST /api/playlists/<int:pk>/unlink/`
  - Auth: `IsAuthenticated`
  - Request body: ignored; no required fields.
  - Success response, status 200:
    ```json
    {
      "id": 123,
      "is_unlinked": true,
      "detail": "Playlist unlinked."
    }
    ```
  - Error behavior:
    - 401 when unauthenticated via existing DRF token auth.
    - 404 `{"detail": "Playlist not found."}` when playlist does not exist, belongs to another user, or is already unlinked.
  - Side effects: updates only the current user's playlist row by setting `is_unlinked=True`.

- Modified endpoint:
  - `GET /api/playlists/`
  - Response remains `PlaylistSerializer[]`, now including `is_unlinked`; all returned rows must have `is_unlinked=false`.

- Modified endpoint:
  - `GET /api/playlists/<int:pk>/`
  - Response remains `PlaylistDetailSerializer`, now including `is_unlinked`; unlinked rows return 404.

- Modified endpoint:
  - `POST /api/playlists/<int:pk>/refresh/`
  - Response remains `PlaylistDetailSerializer`; unlinked rows return 404.

- Modified endpoint:
  - `POST /api/youtube/disconnect/`
  - Success response remains:
    ```json
    {
      "connected": false,
      "removed_playlist_count": 2
    }
    ```
  - Interpret `removed_playlist_count` as number of currently linked OAuth playlists removed from the visible collection.
  - Side effects: set `is_unlinked=True` on current user's linked OAuth playlists and delete current user's `YouTubeOAuthToken`; preserve URL playlists and notes.

- Backend helper updates:
  - `import_playlist_for_user(user: User, url: str) -> Tuple[Playlist, bool]`
    - Must set `is_unlinked=False` in `update_or_create` defaults.
  - `_persist_oauth_playlist(user: User, playlist_data: dict, item_video_map: dict[int, dict], video_details: dict[str, dict]) -> Playlist`
    - Must set `is_unlinked=False` when selected/imported.
  - `import_selected_oauth_playlists_for_user(user: User, playlist_ids: list[str]) -> tuple[list[Playlist], int]`
    - Must soft unlink unselected linked OAuth playlists instead of deleting them.

- Frontend API:
  - `export interface PlaylistUnlinkResponse { id: number; isUnlinked: true; detail: string }`
  - `export function unlinkPlaylist(token: string, id: string | number): Promise<PlaylistUnlinkResponse>`
  - Method: `POST`
  - URL: `${API_BASE_URL}/api/playlists/${id}/unlink/`
  - Headers: existing `authHeaders(token)`
  - Response: normalized snake_case to camelCase.

- Frontend component:
  - `PlaylistCard({ playlist, onUnlink, isUnlinking }: PlaylistCardProps)`
  - `onUnlink` optional callback receives the playlist.
  - The unlink button must call `event.stopPropagation()` before invoking `onUnlink`.

## Implementation Steps

1. Add `is_unlinked` to `Playlist` in `backend/api/models.py`.
2. Add migration `backend/api/migrations/0008_playlist_is_unlinked.py` with dependency on `0007_video_is_removed`.
3. Run `python manage.py migrate` from `backend/` to apply the new migration to the development database.
4. Add `is_unlinked` to `PlaylistSerializer` and `PlaylistDetailSerializer`.
5. Update `playlist_list`, `playlist_detail`, and `playlist_refresh` to filter `is_unlinked=False`.
6. Add `playlist_unlink` in `backend/api/views.py` and route it in `backend/api/urls.py`.
7. Update `youtube_disconnect` to soft unlink linked OAuth playlists instead of deleting them, while still deleting the OAuth token row.
8. Update `import_playlist_for_user` to set `is_unlinked=False` when importing/reimporting a URL playlist.
9. Update OAuth import helpers so selected playlists set `is_unlinked=False`, unchecked OAuth playlists set `is_unlinked=True`, and remote picker imported state ignores unlinked rows.
10. Add/update backend tests for unlink, list/detail filtering, reimport relinking, OAuth selection soft unlink, and OAuth disconnect soft unlink.
11. Add `isUnlinked` and unlink response types to frontend playlist types/API wrappers.
12. Add an unlink action to `PlaylistCard` with event propagation guarded.
13. Wire `PlaylistBrowser` to call `unlinkPlaylist`, remove the playlist from the visible local state after success, and surface an error message on failure.
14. Add an unlink action to `PlaylistDetail` that calls `unlinkPlaylist` and navigates back to `/` after success.
15. Run focused backend tests, then frontend lint/build.
16. Update `.ai/state/feature-playlist-unlink-disconnect.json` to `ready_for_review` only after implementation and verification pass.

## Acceptance Criteria

- [ ] Authenticated users can unlink a URL-imported playlist.
- [ ] Authenticated users can unlink an OAuth-imported playlist.
- [ ] Unlinked playlists no longer appear in `GET /api/playlists/`.
- [ ] Unlinked playlists return 404 from `GET /api/playlists/<id>/` and `POST /api/playlists/<id>/refresh/`.
- [ ] Unlink does not delete the `Playlist` row.
- [ ] Unlink does not delete related `Video` rows.
- [ ] Unlink does not delete `Note` rows.
- [ ] Users cannot unlink another user's playlist.
- [ ] Reimporting the same URL playlist relinks the existing playlist row.
- [ ] Selecting the same OAuth playlist in the remote picker relinks the existing playlist row.
- [ ] Unchecking OAuth playlists in the remote picker soft unlinks them instead of deleting rows.
- [ ] YouTube OAuth disconnect removes linked OAuth playlists from the visible collection without deleting cached playlist/video rows.
- [ ] YouTube OAuth disconnect preserves URL-linked playlists.
- [ ] Frontend playlist grid removes a playlist after successful unlink without requiring a full page reload.
- [ ] Frontend playlist detail unlink returns the user to the playlist browser after success.

## Testing Requirements

- Backend test file to modify: `backend/api/tests.py`
  - Test type: integration-style API tests using existing `APITestCase`.
  - Required test cases:
    - `POST /api/playlists/<id>/unlink/` requires auth.
    - Current user can unlink own linked playlist; playlist and videos still exist in DB with `is_unlinked=True`.
    - Current user cannot unlink another user's playlist and receives 404.
    - `GET /api/playlists/` excludes unlinked playlists.
    - `GET /api/playlists/<id>/` returns 404 for unlinked playlists.
    - URL import of the same playlist sets `is_unlinked=False` on an existing unlinked row.
    - OAuth selected import of the same playlist sets `is_unlinked=False` on an existing unlinked row.
    - OAuth selected import with an empty selected list sets current user's linked OAuth playlists to `is_unlinked=True` and preserves URL playlists.
    - OAuth disconnect sets current user's linked OAuth playlists to `is_unlinked=True`, preserves rows/videos/notes, deletes token, and does not affect another user's token or playlists.
  - Commands to run:
    - From `backend/`: `python manage.py test api`
  - Expected passing result: all backend tests pass.

- Frontend verification:
  - Test type: build/lint verification; no new frontend test framework is present.
  - Required checks:
    - `PlaylistCard` unlink button does not navigate when clicked.
    - `PlaylistBrowser` updates visible state after unlink and displays failure messages.
    - `PlaylistDetail` handles unlink success/failure and disabled state while unlinking.
  - Commands to run:
    - From `frontend/`: `npm run lint`
    - From `frontend/`: `npm run build`
  - Expected passing result: lint and build complete successfully.

- Tests intentionally out of scope:
  - Browser end-to-end tests.
  - Hidden playlist page tests.
  - Snapshot tests.
  - OAuth provider live integration tests.

## Edge Cases

- Unlinking an already unlinked playlist returns 404 to match hidden-from-user behavior.
- Reimporting a previously unlinked URL playlist should reuse the unique existing row and relink it.
- Reimporting a previously unlinked OAuth playlist should reuse the unique existing row and relink it.
- OAuth disconnect when not connected still returns `connected=false` and `removed_playlist_count=0`.
- OAuth disconnect when connected but with no linked OAuth playlists deletes the token and returns count 0.
- Unlinking one user's playlist must not affect another user's playlist with the same YouTube playlist ID.
- Remote picker should not show unlinked playlists as checked/imported.
- Frontend unlink failure should leave the playlist visible and show the error.

## Risks

- Existing tests assert hard deletion for OAuth disconnect and unchecked OAuth playlists; those must be updated carefully to assert soft unlink preservation instead.
- The old stale-column migration means local databases may have a previous `is_unlinked` history; the new migration should be simple and active, not a rollback of the stale field.
- Keeping `Playlist.user` means unlink is a visibility-state dissociation, not anonymized global cache storage. This matches the current schema and avoids broad ownership refactors.
- If UI controls are added inside a clickable playlist card without stopping propagation, clicking unlink could also navigate to detail.
- Existing API consumers may see the additional `is_unlinked` field; this is additive but should not change existing field names or response shapes.

## Out Of Scope

- Hidden playlists page.
- Hide/unhide playlist behavior.
- Permanent delete playlist behavior.
- Bulk URL playlist disconnect separate from per-playlist unlink.
- Changing note ownership or note lookup semantics.
- Changing YouTube OAuth scopes, callback behavior, or token encryption.
- Adding frontend test infrastructure.
- Adding search/filtering or theme work.

## Done Definition

- [ ] Migration exists and has been applied locally with `python manage.py migrate`.
- [ ] Backend model, serializers, views, URLs, YouTube import helpers, and tests are updated.
- [ ] Frontend types, API wrapper, playlist grid, and playlist detail UI are updated.
- [ ] Unlink/disconnect paths soft unlink playlists and preserve cached playlist/video/note data.
- [ ] Relevant backend tests pass with `python manage.py test api`.
- [ ] Frontend passes `npm run lint`.
- [ ] Frontend passes `npm run build`.
- [ ] `.ai/state/feature-playlist-unlink-disconnect.json` reflects final implementation status.
