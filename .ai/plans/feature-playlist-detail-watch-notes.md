# Plan: Playlist Detail Watch Notes

## Goal

Add a new playlist detail watch workspace so pressing into an imported playlist loads the playlist and shows the selected YouTube video on one side with notes on the other side.

## Context

- Branch: `feature-playlist-detail-watch-notes`.
- Plan artifact: `.ai/plans/feature-playlist-detail-watch-notes.md`.
- State artifact: `.ai/state/feature-playlist-detail-watch-notes.json`.
- Frontend is React + Vite + TypeScript in `frontend/`.
- Backend is Django REST Framework in `backend/`.
- Docs in `docs/project-requirements.md` require imported playlists, embedded YouTube playback, and notes.
- `docs/features.md` says the current watch page already has a 70/30 split with `YouTubePlayer` and `MarkdownNotes`.
- `frontend/src/App.tsx` currently routes:
  - `/` to `PlaylistBrowser`
  - `/playlist/:id` to `PlaylistDetail`
  - `/watch/:videoId` to `WatchPage`
- `frontend/src/components/PlaylistCard.tsx` navigates to `/playlist/${playlist.id}`.
- `frontend/src/pages/PlaylistDetail.tsx` fetches `getPlaylist(token, id)` and currently renders playlist metadata plus a vertical list of `VideoListItem` rows.
- `frontend/src/components/VideoListItem.tsx` always navigates to `/watch/${video.youtubeVideoId}` on click.
- `frontend/src/pages/WatchPage.tsx` already composes `YouTubePlayer` and `MarkdownNotes` in a split layout.
- `frontend/src/components/YouTubePlayer.tsx` accepts `initialVideoId?: string` and embeds the iframe for that ID.
- `frontend/src/components/MarkdownNotes.tsx` stores one global localStorage note under `youtube-notes`.
- Backend `GET /api/playlists/<id>/` is authenticated and user-scoped in `backend/api/views.py`, and `PlaylistDetailSerializer` includes nested `videos`.
- Backend work is not expected unless Agent B verifies that the playlist detail endpoint returns an empty or malformed `videos` array for imported playlists.

## Assumptions

- Imported playlist detail is the correct place for the new side-by-side player/notes feature.
- For playlists with videos, the first video should auto-select when the page loads.
- The user should be able to select another video from the imported playlist without leaving the detail page.
- Existing `/watch/:videoId` behavior should remain available for direct video links.
- Notes may remain localStorage-backed in this slice, but should be scoped per video if implemented narrowly.
- No database-backed notes API should be added in this feature.
- No live YouTube API calls should happen during playlist detail display.

## Open Questions

None.

## Files To Modify

### `frontend/src/pages/PlaylistDetail.tsx`

- Purpose of change: convert imported playlist detail into the primary watch-and-notes workspace.
- Modify:
  - Existing playlist detail fetch effect.
  - Existing success render branch.
  - Existing empty playlist render branch only as needed.
- Expected behavior:
  - Keep authenticated `getPlaylist(token, id)` fetch.
  - Keep loading, error, not-found, and empty-playlist states.
  - Add selected-video state.
  - Select the first playlist video automatically when data loads.
  - Render `YouTubePlayer` for the selected video.
  - Render `MarkdownNotes` next to the player.
  - Render the playlist's videos in a scrollable selector/list.
  - Selecting a video updates the player and notes without navigating away.
  - Keep the back button, playlist title, playlist description, and `UserMenu`.

### `frontend/src/components/VideoListItem.tsx`

- Purpose of change: make video rows reusable for either navigation or in-place selection.
- Modify:
  - Props interface.
  - Click handler.
  - Class names for selected state.
- Expected behavior:
  - Default click behavior remains unchanged when no `onSelect` prop is passed.
  - When `onSelect` is passed, clicking calls `onSelect(video)` and does not navigate to `/watch/:videoId`.
  - `isSelected` visually distinguishes the active video.
  - Thumbnail, duration, title, channel, and view-count rendering remain intact.

### `frontend/src/components/MarkdownNotes.tsx`

- Purpose of change: support video-specific notes in the split workspace while preserving existing fallback behavior.
- Modify:
  - Component props.
  - localStorage key derivation.
  - note loading effect.
  - note saving effect.
- Expected behavior:
  - Accept either `videoId?: string` or `storageKey?: string`.
  - Use a stable per-video localStorage key when a video ID/key is provided.
  - Continue using `youtube-notes` when no prop is provided.
  - Reload notes when the key changes.
  - Save edits to the active key.
  - Keep marked-based preview behavior unchanged.

### `frontend/src/pages/WatchPage.tsx`

- Purpose of change: align standalone watch page with the updated `MarkdownNotes` interface.
- Modify:
  - `MarkdownNotes` invocation only.
- Expected behavior:
  - Continue rendering the current split watch page.
  - Pass route `videoId` to `MarkdownNotes` if `MarkdownNotes` supports video-specific notes.
  - Do not otherwise redesign this page.

## Files To Add

None.

## Do Not Touch

- Do not change backend models, migrations, serializers, YouTube API import code, or auth views unless a reproduced backend bug requires it.
- Do not implement database-backed notes.
- Do not implement YouTube OAuth, hidden playlists, unlink, disconnect, removed-video sync, theme toggle, search, or filtering.
- Do not remove `/watch/:videoId`.
- Do not change auth request/response contracts.
- Do not weaken protected routes.
- Do not expose `YOUTUBE_API_KEY` or any backend credential to frontend code.
- Do not add dependencies.
- Do not refactor unrelated pages or redesign the whole app.

## Function Signatures And Interfaces

### `VideoListItem`

Use this interface or a strictly compatible equivalent:

```ts
interface VideoListItemProps {
  video: Video
  isSelected?: boolean
  onSelect?: (video: Video) => void
}
```

- If `onSelect` exists, click calls `onSelect(video)` and does not navigate.
- If `onSelect` is absent, click preserves current behavior:

```ts
localStorage.setItem('youtube-video-id', video.youtubeVideoId)
navigate(`/watch/${video.youtubeVideoId}`)
```

### `MarkdownNotes`

Use one of these interfaces:

```ts
interface MarkdownNotesProps {
  videoId?: string
}
```

or:

```ts
interface MarkdownNotesProps {
  storageKey?: string
}
```

- If `videoId` is provided, derive a stable key such as `youtube-notes:${videoId}`.
- If `storageKey` is provided, use it directly.
- If neither is provided, use the existing fallback key `youtube-notes`.
- Missing localStorage values return an empty note string.

### `PlaylistDetail`

Use selected-video state with this shape or equivalent:

```ts
const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
```

or:

```ts
const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
```

- After playlist data loads, default to `playlist.videos[0]` if no selected video exists.
- If selected video ID no longer appears in `playlist.videos`, fall back to the first video.
- If there are zero videos, render the empty state and do not render a player pane.

## Implementation Steps

1. Read `PlaylistDetail`, `VideoListItem`, `WatchPage`, `YouTubePlayer`, and `MarkdownNotes` to confirm current props and layout.
2. Update `MarkdownNotes` to support an optional video-specific key while preserving existing fallback behavior.
3. Update `VideoListItem` to support optional `onSelect` and `isSelected`.
4. Refactor `PlaylistDetail` success state:
   - Keep the header.
   - Derive the selected video from playlist videos.
   - Auto-select the first video when appropriate.
   - Render player and notes side by side for non-empty playlists.
   - Render the playlist video selector in the same workspace.
5. Update `WatchPage` to pass `videoId` to `MarkdownNotes` if the notes interface changed.
6. Fix touched-file mojibake text such as `Loading playlistâ€¦` only where encountered.
7. Run frontend build and lint.
8. Manually smoke test imported playlist detail with at least one video.

## Acceptance Criteria

- Clicking an imported playlist card opens `/playlist/:id` and loads playlist content.
- If the playlist has videos, the first video is selected automatically.
- The selected video appears in a YouTube iframe on the left side of the playlist detail workspace on desktop.
- Notes appear on the other side of the playlist detail workspace.
- Selecting another playlist video updates the player without navigating away.
- Notes are video-specific in localStorage if `MarkdownNotes` receives a video ID/key.
- Empty playlists still show an empty state.
- Detail API errors still show an error state with navigation back to all playlists.
- Direct `/watch/:videoId` still works.
- Protected route behavior is unchanged.

## Testing Requirements

- Frontend build:
  - File coverage: all changed frontend files.
  - Type: build/type check.
  - Command: `cd frontend && npm run build`.
  - Expected result: command passes.
- Frontend lint:
  - File coverage: all changed frontend files.
  - Type: lint.
  - Command: `cd frontend && npm run lint`.
  - Expected result: command passes.
- Manual smoke test:
  - Type: manual integration check.
  - Steps: log in, open or import a playlist with videos, click the playlist card, confirm player/notes split, select another video, confirm iframe changes.
  - Expected result: no blank playlist detail for a playlist with videos.
- Backend tests:
  - Not required unless backend files are changed.
- Out of scope:
  - New E2E suite.
  - Snapshot tests.
  - Database note persistence tests.

## Edge Cases

- Playlist has zero videos.
- Playlist detail request returns `404`.
- Playlist detail request fails due to auth/session expiry.
- Video has missing thumbnail URL.
- User switches videos repeatedly.
- A selected video's note does not exist yet in localStorage.
- Long titles should not overlap the player, notes, or list panes.
- Narrow viewports should stack or otherwise remain usable without horizontal overflow.

## Risks

- `YouTubePlayer` includes an input that can load a video not in the playlist; this is acceptable unless it creates confusing state during implementation.
- `MarkdownNotes` currently renders marked output with `dangerouslySetInnerHTML`; do not broaden this surface.
- The split view can become cramped on mobile; keep responsive behavior simple and robust.
- Current branch history is ahead of remote; do not rewrite or reset it.

## Out Of Scope

- Backend playlist import fixes.
- Database-backed per-user notes.
- Obsidian-style markdown Enter behavior.
- Removed-video warnings.
- OAuth and playlist management actions.
- Theme work.
- Search/filter.
- Full UI redesign.

## Done Definition

- Plan is implemented only in the listed frontend files.
- Imported playlist detail renders player plus notes when videos exist.
- First video auto-selection works.
- In-place video selection works.
- Existing standalone watch route still works.
- Frontend build passes.
- Frontend lint passes.
- Manual smoke test passes.
