# Plan: Per-User Database Notes

## Goal

Move markdown note content from browser-local persistence to authenticated, per-user database persistence keyed by YouTube video ID, with a backend `Note` model, serializer, `/api/notes/<video_id>/` route, frontend notes API client, and `MarkdownNotes` integration.

## Context

The repository is a Django 6 + Django REST Framework backend in `backend/` and a React 19 + TypeScript + Vite frontend in `frontend/`.

Backend authentication uses DRF token auth. `backend/api/views.py` applies `@permission_classes([IsAuthenticated])` on user-owned playlist routes, and playlist queries are scoped with `user=request.user`. `backend/api/models.py` currently has user-owned `Playlist` rows and related `Video` rows, but no `Note` model. `backend/api/serializers.py` has serializers for auth, playlist import, playlists, and videos, but no note serializer. `backend/api/urls.py` exposes auth and playlist routes under `/api/`, but no notes route.

Frontend protected routes are defined in `frontend/src/App.tsx`, so both `PlaylistDetail` and `WatchPage` render only after authentication. `frontend/src/auth/AuthProvider.tsx` stores the auth token in `localStorage` under `TOKEN_STORAGE_KEY`; `frontend/src/auth/useAuth.ts` exposes it to components. `frontend/src/api/playlists.ts` shows the existing frontend API client pattern: `API_BASE_URL`, token auth headers, JSON parsing, and snake_case-to-camelCase normalization.

`frontend/src/components/MarkdownNotes.tsx` currently stores note content in `localStorage` using `youtube-notes:<videoId>` and stores the editor mode preference in `youtube-notes:editor-mode`. The component renders markdown through `marked` and `CodeMirrorMarkdownEditor`. `frontend/src/pages/PlaylistDetail.tsx` and `frontend/src/pages/WatchPage.tsx` both render `MarkdownNotes` keyed by the selected/current YouTube video ID.

Backend tests live in `backend/api/tests.py` and use `APITestCase`, `Token`, helper auth headers, and direct endpoint assertions. Existing tests emphasize auth requirements and per-user scoping, which are the highest-risk areas for notes.

## Assumptions

- Notes are keyed by YouTube video ID, not by imported `Video.id`, because `/watch/:videoId` can show standalone videos that may not belong to an imported playlist.
- Each authenticated user can have at most one note per YouTube video ID.
- The notes endpoint should support `GET` and `PUT` only for this feature.
- `GET /api/notes/<video_id>/` should return an empty note shape when no row exists yet, rather than `404`, so the editor can load cleanly for new notes.
- `PUT /api/notes/<video_id>/` should upsert the authenticated user's note content and return the saved note.
- Existing editor mode preference may remain in `localStorage` because it is a UI preference, not note content.
- Do not automatically migrate legacy `localStorage` note content into the database because existing local note keys are not user-scoped and could leak notes between accounts on shared browsers.

## Open Questions

None.

## Files To Modify

- Path: `backend/api/models.py`
  - Purpose of change: Add a `Note` model.
  - Specific symbols to modify: Add `class Note(models.Model)` after `Video`.
  - Expected behavior after modification: Notes are stored per `User` and `youtube_video_id`, with one row per user/video pair and timestamps for creation/update.

- Path: `backend/api/serializers.py`
  - Purpose of change: Add note serialization and validation.
  - Specific symbols to modify: Import `Note`; add `NoteSerializer`.
  - Expected behavior after modification: The API can serialize note rows and validate incoming `content` values.

- Path: `backend/api/views.py`
  - Purpose of change: Add authenticated note retrieval and upsert endpoint.
  - Specific symbols to modify: Import `Note` and `NoteSerializer`; add `note_detail(request, video_id)`.
  - Expected behavior after modification: Authenticated users can fetch and update only their own note for the requested YouTube video ID.

- Path: `backend/api/urls.py`
  - Purpose of change: Wire the notes endpoint.
  - Specific symbols to modify: Add `path("notes/<str:video_id>/", views.note_detail, name="note-detail")`.
  - Expected behavior after modification: `/api/notes/<video_id>/` routes to the new authenticated note view.

- Path: `backend/api/tests.py`
  - Purpose of change: Add focused backend tests for notes auth, upsert, validation, and user scoping.
  - Specific symbols to modify: Import `Note` if useful inside tests; add a `NoteDetailTests` or similarly named `APITestCase`.
  - Expected behavior after modification: Tests prove notes require auth, are scoped per user, return an empty shape before creation, and update without duplicating rows.

- Path: `frontend/src/components/MarkdownNotes.tsx`
  - Purpose of change: Replace note content `localStorage` persistence with database-backed load/save through the notes API.
  - Specific symbols to modify: `MarkdownNotesProps`, component state/effects, save/load behavior.
  - Expected behavior after modification: Note content loads from the authenticated backend for the current `videoId`, saves edits back to the backend, and no longer writes note content to `localStorage`.

## Files To Add

- Path: `backend/api/migrations/0005_note.py`
  - Purpose: Add the database table for per-user notes.
  - Expected exports/functions/classes/tests: Django migration with dependency on `0004_fix_video_columns` and `auth.User`; create `Note` model with fields and unique constraint described below.

- Path: `frontend/src/api/notes.ts`
  - Purpose: Provide frontend API client functions for note retrieval and update.
  - Expected exports/functions/classes/tests: Export `Note`, `getNote(token, videoId)`, and `saveNote(token, videoId, content)` using the same API base URL and token auth style as existing clients.

## Do Not Touch

- Do not change auth token storage, login, register, logout, or protected-route behavior.
- Do not change playlist import behavior, playlist response shapes, or YouTube API integration.
- Do not add a foreign key from `Note` to `Video`; notes must work for standalone `/watch/:videoId` videos.
- Do not persist OAuth tokens, YouTube API credentials, or note content in logs.
- Do not add automatic legacy localStorage note migration in this implementation.
- Do not refactor `CodeMirrorMarkdownEditor`, markdown parsing, or editor command logic except where strictly required to pass note content and state.
- Do not add new frontend dependencies or backend dependencies.
- Do not alter production-sensitive settings such as `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, or CORS.
- Do not introduce broad UI redesigns, new note lists, note search, sharing, export, or rich-text features.

## Function Signatures And Interfaces

Backend model:

```python
class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")
    youtube_video_id = models.CharField(max_length=20, db_index=True)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Model constraints:

```python
models.UniqueConstraint(
    fields=["user", "youtube_video_id"],
    name="unique_user_video_note",
)
```

Recommended model ordering:

```python
ordering = ["-updated_at"]
```

Backend serializer:

```python
class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ("id", "youtube_video_id", "content", "created_at", "updated_at")
        read_only_fields = ("id", "youtube_video_id", "created_at", "updated_at")
```

Endpoint:

```text
GET /api/notes/<video_id>/
Authorization: Token <token>
```

Successful `GET` response when a note exists:

```json
{
  "id": 1,
  "youtube_video_id": "abc123",
  "content": "# My notes",
  "created_at": "2026-06-06T12:00:00Z",
  "updated_at": "2026-06-06T12:05:00Z"
}
```

Successful `GET` response when no note exists:

```json
{
  "id": null,
  "youtube_video_id": "abc123",
  "content": "",
  "created_at": null,
  "updated_at": null
}
```

Endpoint:

```text
PUT /api/notes/<video_id>/
Authorization: Token <token>
Content-Type: application/json

{ "content": "markdown text" }
```

Successful `PUT` response:

```json
{
  "id": 1,
  "youtube_video_id": "abc123",
  "content": "markdown text",
  "created_at": "2026-06-06T12:00:00Z",
  "updated_at": "2026-06-06T12:05:00Z"
}
```

Backend validation behavior:

- Missing `content` returns `400`.
- Non-string `content` returns `400`.
- Blank `content` is valid and should save as an empty string.
- Invalid or blank `video_id` path values should not create ambiguous rows. If Django routing permits the request, reject blank or whitespace-only values with `400`.
- Unauthenticated requests return `401`.

Frontend API client:

```ts
export interface Note {
  id: number | null
  youtubeVideoId: string
  content: string
  createdAt: string | null
  updatedAt: string | null
}

export function getNote(token: string, videoId: string): Promise<Note>
export function saveNote(token: string, videoId: string, content: string): Promise<Note>
```

Frontend component interface:

```ts
interface MarkdownNotesProps {
  videoId?: string
}
```

`MarkdownNotes` may continue to read the auth token via `useAuth()` internally. It should keep using `EDITOR_MODE_KEY` in `localStorage` for editor mode only.

Frontend error/loading behavior:

- While loading a note for a valid `videoId`, show a compact loading state in the editor area or keep the editor disabled until content is loaded.
- If loading fails, show a compact error message in the notes panel and keep the editor usable only if doing so does not silently overwrite server content.
- Save edits with a small debounce, about 500 ms, to avoid a network request per keystroke.
- Do not issue note API calls when `videoId` or `token` is missing.
- Avoid saving the initial empty state before the `GET` request completes.

## Implementation Steps

1. Add `Note` to `backend/api/models.py` with `user`, `youtube_video_id`, `content`, `created_at`, `updated_at`, a unique constraint on `user` + `youtube_video_id`, and ordering by `-updated_at`.
2. Generate or write `backend/api/migrations/0005_note.py` for the new model. Use Django's migration style matching existing migrations.
3. Add `NoteSerializer` to `backend/api/serializers.py` and include only `id`, `youtube_video_id`, `content`, `created_at`, and `updated_at`.
4. Add `note_detail` to `backend/api/views.py` with `@api_view(["GET", "PUT"])` and `@permission_classes([IsAuthenticated])`.
5. In `note_detail`, normalize/validate the path `video_id` by stripping whitespace for validation but do not alter legitimate YouTube IDs. Reject empty/whitespace-only IDs with `400`.
6. For `GET`, query `Note.objects.filter(user=request.user, youtube_video_id=video_id).first()`. Return serialized data if found; otherwise return the empty note shape with null metadata.
7. For `PUT`, validate request data with `NoteSerializer` or a serializer-level content field, then use `Note.objects.update_or_create(user=request.user, youtube_video_id=video_id, defaults={"content": content})`. Return serialized data with `200`.
8. Add the URL pattern `notes/<str:video_id>/` in `backend/api/urls.py`.
9. Add focused tests in `backend/api/tests.py` covering authentication required, empty `GET`, create via `PUT`, update via second `PUT` without duplicate rows, blank content allowed, missing content rejected, and per-user isolation for the same `video_id`.
10. Add `frontend/src/api/notes.ts` with the `Note` interface, JSON parsing, auth headers, snake_case-to-camelCase normalization, `getNote`, and `saveNote`.
11. Update `frontend/src/components/MarkdownNotes.tsx` to use `useAuth`, load note content from `getNote(token, videoId)` when `token` and `videoId` are present, and reset state when the video changes.
12. Remove note-content writes to `localStorage` from `MarkdownNotes`; keep `EDITOR_MODE_KEY` persistence unchanged.
13. Add debounced saving in `MarkdownNotes` after the initial note load completes. Clear pending debounce timers on unmount or when `videoId` changes.
14. Prevent stale responses from overwriting the current editor state by using an `isMounted`/request-active flag in note load effects.
15. Run backend migrations/tests and frontend build/lint commands listed below.

## Acceptance Criteria

- [ ] Authenticated `GET /api/notes/<video_id>/` returns the current user's note when it exists.
- [ ] Authenticated `GET /api/notes/<video_id>/` returns an empty note shape with `content: ""` and null metadata when no note exists.
- [ ] Authenticated `PUT /api/notes/<video_id>/` creates or updates exactly one note row for the current user and video ID.
- [ ] Two users can save different notes for the same YouTube video ID without seeing or overwriting each other's content.
- [ ] Unauthenticated notes requests return `401`.
- [ ] `MarkdownNotes` loads note content from the backend for the current video after authentication.
- [ ] Editing notes in `PlaylistDetail` or `WatchPage` persists to the database and reloads after navigating away/back or refreshing the page.
- [ ] Note content is no longer written to `localStorage`.
- [ ] Editor mode preference still persists locally.
- [ ] No playlist, auth, or YouTube import API response shape changes.

## Testing Requirements

- Test file to modify: `backend/api/tests.py`
  - Test type: integration tests with `APITestCase`.
  - Required cases:
    - `test_note_requires_auth`: unauthenticated `GET` and `PUT` return `401`.
    - `test_get_missing_note_returns_empty_shape`: authenticated `GET` before creation returns `200`, matching `youtube_video_id`, `content: ""`, and null metadata.
    - `test_put_creates_note`: authenticated `PUT` with `{"content": "hello"}` returns `200`, creates one `Note`, and stores it for `request.user`.
    - `test_put_updates_existing_note_without_duplicate`: two `PUT` requests for the same user/video leave one row with the latest content.
    - `test_blank_content_is_allowed`: `PUT` with `{"content": ""}` succeeds.
    - `test_missing_content_is_rejected`: `PUT` without `content` returns `400`.
    - `test_notes_are_scoped_per_user`: user A and user B save different content for the same `video_id`; each `GET` returns only their own content.
  - Commands to run:
    - From `backend/`: `python manage.py test api`
  - Expected passing result: Django reports all `api` tests passing.

- Frontend verification:
  - Test type: build and lint verification, because the project currently has no dedicated frontend unit test framework.
  - Commands to run:
    - From `frontend/`: `npm run build`
    - From `frontend/`: `npm run lint`
  - Expected passing result: TypeScript build and ESLint complete without errors.

- Migration verification:
  - Command to run:
    - From `backend/`: `python manage.py makemigrations --check --dry-run`
  - Expected passing result: Django reports no model changes pending after `0005_note.py`.

- Tests intentionally out of scope:
  - No end-to-end browser automation for note editing.
  - No frontend unit tests unless the implementer discovers an existing test harness not visible in current project files.
  - No legacy localStorage migration tests.

## Edge Cases

- A user opens a video with no existing note.
- A user saves an empty note.
- A user switches videos while a note load or debounce save is pending.
- A backend save fails after the user edits content.
- Two users save notes for the same YouTube video ID.
- A standalone `/watch/:videoId` video has no imported `Video` row.
- `videoId` or auth token is temporarily unavailable during route/auth initialization.

## Risks

- Stale frontend requests can overwrite the visible note when users switch videos quickly; guard load/save effects by the active `videoId`.
- Debounced saves can fire after unmount if timers are not cleared.
- Saving the initial empty state before load completes could erase existing server notes; explicitly track load completion before saving.
- Existing browser-local notes will not appear after this change. Automatic migration is intentionally out of scope because legacy localStorage note keys are not user-scoped.
- Backend user scoping is security-critical; every note query must include `user=request.user`.
- `marked` rendering remains a separate XSS-sensitive area; this feature should not expand markdown rendering behavior.

## Out Of Scope

- Legacy localStorage note migration UI or automatic import.
- Note sharing, public notes, collaboration, export, search, tags, or note history.
- Rich-text editing changes.
- Playlist/video schema changes beyond the new independent `Note` model.
- OAuth or YouTube account integration.
- Production settings hardening.
- Frontend redesign.

## Done Definition

- [ ] `Note` model and migration exist and match the specified per-user/video uniqueness behavior.
- [ ] `NoteSerializer`, `note_detail`, and `/api/notes/<video_id>/` are implemented.
- [ ] Backend tests for auth, scoping, empty retrieval, create/update, and validation pass.
- [ ] `frontend/src/api/notes.ts` exists and exposes typed `getNote` and `saveNote` functions.
- [ ] `MarkdownNotes` loads/saves note content through the backend and keeps only editor mode in `localStorage`.
- [ ] `python manage.py makemigrations --check --dry-run` reports no pending migration changes.
- [ ] `python manage.py test api` passes.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes or any pre-existing lint failures are documented clearly.
