# Features: YouTube Playlist Viewer

Current feature inventory for the `master` branch. This file distinguishes what is actually implemented on `master` from work that exists only in open GitHub pull requests.

## Implemented On Master

- **React + TypeScript + Vite frontend shell** -- frontend app routes are wired through React Router. Source: `frontend/src/App.tsx`, `frontend/package.json`
- **Login and register pages** -- UI forms for username/password login and username/email/password registration. Source: `frontend/src/pages/AuthPage.tsx`
- **Frontend auth API client** -- calls `/api/auth/login/`, `/api/auth/register/`, and `/api/auth/me/`. Source: `frontend/src/api/auth.ts`
- **Auth provider with token persistence** -- stores the DRF token in `localStorage`, loads the current user, and clears the session if `/api/auth/me/` fails. Source: `frontend/src/auth/AuthProvider.tsx`, `frontend/src/auth/AuthContext.ts`
- **Protected routes** -- playlist, detail, and watch pages require an authenticated frontend session and redirect unauthenticated users to `/login`. Source: `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/App.tsx`
- **User menu** -- displays username/email and provides a logout button. Source: `frontend/src/components/UserMenu.tsx`
- **Database-backed playlist browser** -- displays the current user's imported playlist cards from the backend in a responsive grid. Source: `frontend/src/pages/PlaylistBrowser.tsx`, `frontend/src/api/playlists.ts`, `frontend/src/components/PlaylistCard.tsx`
- **Database-backed playlist detail page** -- shows a selected playlist and its videos from the database, with back navigation. Source: `frontend/src/pages/PlaylistDetail.tsx`, `frontend/src/components/VideoListItem.tsx`
- **Video list item UI** -- shows thumbnail, duration badge, title, channel, and formatted view count; stores selected video ID in `localStorage` before navigating to the watch page. Source: `frontend/src/components/VideoListItem.tsx`
- **Watch page** -- 70/30 split layout with embedded YouTube player and notes sidebar. Source: `frontend/src/pages/WatchPage.tsx`
- **YouTube player** -- embedded iframe player with URL/video ID input, Enter-to-load behavior, and `localStorage` persistence for the last video ID. Source: `frontend/src/components/YouTubePlayer.tsx`
- **Markdown notes editor** -- edit/preview toggle using `marked`; notes are currently stored in `localStorage`. Source: `frontend/src/components/MarkdownNotes.tsx`
- **Dark theme styling** -- current UI uses a dark color scheme with red accent styling. Source: `frontend/src/index.css`, `frontend/src/pages/*`, `frontend/src/components/*`
- **Frontend playlist/video TypeScript types** -- API-backed `Playlist`, `Video`, `PlaylistDetail` interfaces with camelCase normalization. Source: `frontend/src/types/playlist.ts`
- **Django + DRF backend scaffold** -- backend has Django, DRF, CORS, SQLite settings, and auth + playlist endpoints. Source: `backend/config/settings.py`, `backend/api/views.py`, `backend/api/urls.py`
- **YouTube playlist URL import** -- authenticated users can paste a public YouTube playlist URL; playlist and video metadata are fetched via YouTube Data API v3, stored in the local database, and rendered by the browser/detail/watch flows. Source: `backend/api/youtube.py`, `backend/api/views.py`, `frontend/src/pages/PlaylistBrowser.tsx`
- **Backend playlist/video models** -- `Playlist` and `Video` Django models with per-user scoping and unique constraints. Source: `backend/api/models.py`, `backend/api/migrations/0001_initial.py`
- **Project requirements documentation** -- requirements and YouTube API planning docs are present on `master`. Source: `docs/project-requirements.md`, `docs/plans/product/youtube-api-integration.md`, `docs/plans/specs/youtube-api-integration.md`

## Not Implemented On Master Yet

- **YouTube OAuth integration** -- no committed OAuth token model, encryption utility, OAuth views, or YouTube service exists on `master`.
- **Playlist hide/unhide/unlink/disconnect** -- not present on `master`.
- **Per-user database notes** -- notes are still localStorage-backed on `master`; `/api/notes/` does not exist on committed backend.
- **Removed-video UI** -- no `is_removed` handling, removed badge, dimmed styling, or removed-video warning exists on `master`.
- **Theme toggle** -- dark theme exists, but no dark/light toggle or browser-persisted theme preference exists on `master`.
- **Obsidian-style Enter markdown behavior** -- markdown preview exists, but headings do not auto-format on Enter in the editor.
- **AI/Gemini analysis and chat** -- future/broader plan only.
- **Search and filter polish** -- future/broader plan only.
- **Manual playlist refresh/sync** -- future-only per requirements.
- **Production CORS hardening** -- `CORS_ALLOW_ALL_ORIGINS = True` remains in backend settings.

## Open GitHub PRs

All listed PRs are currently open and unmerged against `master`.

- **PR #1** -- [feat: UserProfile model, UUID, and DRF TokenAuth config](https://github.com/ha0xian/YoutubePlaylist/pull/1) -- open, not merged
- **PR #2** -- [feat: Auth endpoints - register, login, me, with tests](https://github.com/ha0xian/YoutubePlaylist/pull/2) -- open, not merged
- **PR #3** -- [feat: Add uuid to AuthUser TypeScript interface](https://github.com/ha0xian/YoutubePlaylist/pull/3) -- open, not merged
- **PR #4** -- [feat: add YouTube API backend foundation (models, encryption, API client)](https://github.com/ha0xian/YoutubePlaylist/pull/4) -- open, not merged
- **PR #5** -- [feat: API client, types, and usePlaylists hook](https://github.com/ha0xian/YoutubePlaylist/pull/5) -- open, not merged
- **PR #6** -- [feat: API endpoints for YouTube OAuth, playlist CRUD, URL import, and video notes](https://github.com/ha0xian/YoutubePlaylist/pull/6) -- open, not merged
- **PR #7** -- [Slice 04: Frontend UI for YouTube link flow, playlist management, per-user notes, and theme toggle](https://github.com/ha0xian/YoutubePlaylist/pull/7) -- open, not merged

## PR Feature Summary

- **Auth backend is in PRs #1 and #2** -- UserProfile/UUID, DRF TokenAuthentication setup, register/login/me endpoints, and backend tests.
- **Frontend UUID type update is in PR #3** -- adds `uuid` to the frontend `AuthUser` type.
- **YouTube backend foundation is in PR #4** -- OAuth token model, Playlist/Video models, encryption helper, YouTube API service, admin updates, and backend tests.
- **Frontend playlist API layer is in PR #5** -- playlist API client, updated playlist/video types, `usePlaylists` hook, and frontend tests.
- **YouTube backend endpoints are in PR #6** -- OAuth flow endpoints, playlist list/detail/link/hide/unlink, disconnect, video notes, serializers, and tests.
- **Frontend YouTube integration UI is in PR #7** -- OAuth button, playlist URL input, callback handler, hidden playlists page, theme toggle, backend-backed notes, removed-video UI, and tests.
