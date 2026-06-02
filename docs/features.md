# Features: YouTube Playlist Viewer

Full-stack app (React + TypeScript, Django + DRF) for browsing YouTube playlists, watching videos, and taking per-user notes.

## ✅ Implemented

- **User Authentication** — register, login, logout, current-user endpoint via DRF TokenAuthentication (source: [views.py:18-21](backend/api/views.py#L18-L21), [AuthProvider.tsx](frontend/src/auth/AuthProvider.tsx))
- **YouTube OAuth Integration** — connect/disconnect YouTube account via OAuth 2.0, with encrypted token storage (source: [views.py:22-71](backend/api/views.py#L22-L71), [encryption.py](backend/api/encryption.py))
- **YouTube API Client** — fetch playlists, playlist items, video details from YouTube Data API v3 with pagination (source: [youtube_service.py](backend/api/youtube_service.py))
- **Playlist CRUD REST API** — list, detail, and manage playlists scoped to authenticated user (source: [views.py:73-157](backend/api/views.py#L73-L157))
- **Playlist URL Import** — paste a public YouTube playlist URL to import playlist + all video metadata (source: [views.py:90-133](backend/api/views.py#L90-L133), [playlist.ts:74-90](frontend/src/api/playlist.ts#L74-L90))
- **Playlist Hide / Unhide** — hide playlists from main view, browse hidden list, restore to visible (source: [views.py:135-149](backend/api/views.py#L135-L149), [playlist.ts:93-142](frontend/src/api/playlist.ts#L93-L142))
- **Playlist Unlink** — dissociate a playlist from account without deleting cached data (source: [views.py:151-157](backend/api/views.py#L151-L157))
- **Per-User Video Notes (Backend)** — create/update/read markdown notes per user per video, persisted in DB (source: [views.py:159-171](backend/api/views.py#L159-L171), [models.py:57-78](backend/api/models.py#L57-L78))
- **OAuth Token Encryption** — Fernet encryption for YouTube OAuth access/refresh tokens at rest (source: [encryption.py](backend/api/encryption.py))
- **Django Admin** — admin panel for Playlist, Video, VideoNote, YouTubeOAuthToken with encrypted token display (source: [admin.py](backend/api/admin.py))
- **Video Soft-Delete** — `is_removed` flag on Video model for videos removed from source YouTube playlist (source: [models.py:96](backend/api/models.py#L96))
- **Multi-User Support** — all data (playlists, videos, notes, OAuth tokens) scoped per user account (source: [models.py](backend/api/models.py))
- **Protected Routes (Frontend)** — authenticated-only page access with redirect to login, token persistence in localStorage (source: [ProtectedRoute.tsx](frontend/src/components/ProtectedRoute.tsx), [AuthProvider.tsx](frontend/src/auth/AuthProvider.tsx))
- **YouTube Video Player** — embedded iframe player with URL/video ID input and localStorage persistence (source: [YouTubePlayer.tsx](frontend/src/components/YouTubePlayer.tsx))
- **Markdown Notes Editor** — edit/preview toggle with `marked` rendering, localStorage-backed (source: [MarkdownNotes.tsx](frontend/src/components/MarkdownNotes.tsx))
- **Playlist Browser** — grid layout of playlist cards with thumbnail, title, channel, video count (source: [PlaylistBrowser.tsx](frontend/src/pages/PlaylistBrowser.tsx))
- **Playlist Detail Page** — video list with back-button navigation (source: [PlaylistDetail.tsx](frontend/src/pages/PlaylistDetail.tsx))
- **Watch Page** — 70/30 split layout with YouTube player + notes sidebar (source: [WatchPage.tsx](frontend/src/pages/WatchPage.tsx))
- **Dark Theme UI** — dark color scheme with red accent (#cc0000) (source: [WatchPage.tsx](frontend/src/pages/WatchPage.tsx), [App.tsx](frontend/src/App.tsx))
- **TypeScript API Types** — typed interfaces for Playlist, Video, VideoNote, auth responses (source: [playlist.ts](frontend/src/types/playlist.ts), [auth.ts](frontend/src/api/auth.ts))
- **usePlaylists Hook** — reusable hook with linkByUrl, hide, unhide, unlink, disconnectYouTube actions (source: [usePlaylists.ts](frontend/src/hooks/usePlaylists.ts))
- **API Client** — `authFetch` wrapper with token header injection and error parsing for all backend endpoints (source: [auth.ts:42-60](frontend/src/api/auth.ts#L42-L60), [playlist.ts](frontend/src/api/playlist.ts))
- **Backend Test Suite** — model, encryption, OAuth, playlist CRUD, hide/unhide, and note tests (source: [tests.py](backend/api/tests.py))
- **Token Disconnect on 401** — auto-clear session and redirect when backend returns unauthorized (source: [ProtectedRoute.tsx](frontend/src/components/ProtectedRoute.tsx))
- **Duration Formatting** — ISO 8601 to human-readable string (e.g. PT1H2M3S → 1:02:03) (source: [youtube_service.py:171-203](backend/api/youtube_service.py#L171-L203))

## 🔄 In PR

- **PR #6** — [feat: API endpoints for YouTube OAuth, playlist CRUD, URL import, and video notes](https://github.com/ha0xian/YoutubePlaylist/pull/6) — status: **open** (current branch)
- **PR #7** — [Slice 04: Frontend UI for YouTube link flow, playlist management, per-user notes, and theme toggle](https://github.com/ha0xian/YoutubePlaylist/pull/7) — status: **open**
- **PR #5** — [feat: API client, types, and usePlaylists hook](https://github.com/ha0xian/YoutubePlaylist/pull/5) — status: **open**
- **PR #4** — [feat: add YouTube API backend foundation (models, encryption, API client)](https://github.com/ha0xian/YoutubePlaylist/pull/4) — status: **open**

## 📋 To Be Implemented

- **Wire Frontend Pages to API** — PlaylistBrowser and PlaylistDetail still use mock data instead of API hooks (source: [PlaylistBrowser.tsx:1](frontend/src/pages/PlaylistBrowser.tsx#L1), [PlaylistDetail.tsx:2](frontend/src/pages/PlaylistDetail.tsx#L2))
- **Wire Notes to Backend API** — MarkdownNotes still uses localStorage instead of `/api/notes/` (source: [MarkdownNotes.tsx:4](frontend/src/components/MarkdownNotes.tsx#L4))
- **Removed-Video UI** — badge, dimmed styling, and filter (All/Available/Removed) for videos with `is_removed` flag (source: [youtube-api-integration.md:37-39](docs/plans/product/youtube-api-integration.md#L37-L39))
- **Theme Toggle (Dark/Light)** — UI toggle with persisted preference (source: [youtube-api-integration.md:55](docs/plans/product/youtube-api-integration.md#L55))
- **Responsive Layout** — responsive playlist grid and video list (source: [youtube-api-integration.md:56](docs/plans/product/youtube-api-integration.md#L56))
- **Manual Playlist Sync** — re-fetch playlist from YouTube, mark removed videos (source: [youtube-api-integration.md:41-42](docs/plans/product/youtube-api-integration.md#L41-L42))
- **AI Video Analysis & Chat** — Gemini-powered video summary/key topics and stateless chat panel (source: [youtube-api-integration.md:72](docs/plans/product/youtube-api-integration.md#L72))
- **Search & Filter** — playlist search by title/channel, video search within playlist, sort options (source: [youtube-api-integration.md:73](docs/plans/product/youtube-api-integration.md#L73))
- **Account & Settings Page** — username, email, YouTube connection status, reconnect action (source: [frontend-feature-plan.html](plan/frontend-feature-plan.html) — Phase 8)
- **Obsidian-Style Markdown Editing** — headings format on Enter keypress (source: [youtube-api-integration.md:31](docs/plans/product/youtube-api-integration.md#L31))
- **CORS Configuration for Production** — restrict `CORS_ALLOW_ALL_ORIGINS` from wildcard (source: [settings.py:14](backend/config/settings.py#L14))
