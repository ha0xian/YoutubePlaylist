# Features: YouTube Playlist Viewer

Current feature inventory for the `master` branch, verified from the backend and
frontend code surface rather than planning documents.

## Implemented On Master

- **React + TypeScript + Vite frontend shell** -- routes are wired through React Router in `frontend/src/App.tsx`.
- **Login and register UI** -- `/login` and `/register` render username/password auth forms through `frontend/src/pages/AuthPage.tsx`.
- **Frontend auth API client** -- `frontend/src/api/auth.ts` calls `/api/auth/login/`, `/api/auth/register/`, and `/api/auth/me/`.
- **Token-backed frontend session** -- `frontend/src/auth/AuthProvider.tsx` stores the DRF token in `localStorage`, loads the current user, and clears invalid sessions.
- **Protected frontend routes** -- `frontend/src/components/ProtectedRoute.tsx` protects `/`, `/playlist/:id`, and `/watch/:videoId`.
- **User menu and logout** -- `frontend/src/components/UserMenu.tsx` displays the signed-in user and clears the auth session.
- **Playlist browser** -- `frontend/src/pages/PlaylistBrowser.tsx` lists the authenticated user's backend playlists and supports public YouTube playlist URL import.
- **Playlist detail workspace** -- `frontend/src/pages/PlaylistDetail.tsx` loads one playlist from the backend, auto-selects a video, embeds the YouTube player, shows notes, and lists playlist videos.
- **Standalone watch page** -- `frontend/src/pages/WatchPage.tsx` renders a 70/30 player and notes layout for `/watch/:videoId`.
- **YouTube player component** -- `frontend/src/components/YouTubePlayer.tsx` embeds a YouTube iframe, accepts URL/video ID input, supports Enter-to-load, and persists the last video ID in `localStorage`.
- **Video list item UI** -- `frontend/src/components/VideoListItem.tsx` renders thumbnail, duration, title, channel, formatted view count, and selected-video behavior.
- **Markdown notes editor** -- `frontend/src/components/MarkdownNotes.tsx` provides edit/preview modes with `marked`; notes are stored per video in `localStorage`.
- **Dark theme styling** -- the current CSS and components use a fixed dark UI with red accent styling.
- **Playlist/video TypeScript types** -- `frontend/src/types/playlist.ts` defines the frontend `Playlist`, `PlaylistDetail`, and `Video` shapes used by the API client.
- **Django + Django REST Framework backend** -- `backend/config/settings.py`, `backend/config/urls.py`, and `backend/api/urls.py` expose the backend app under `/api/`.
- **Token auth backend endpoints** -- `backend/api/views.py` implements register, login, and current-user endpoints using DRF token authentication.
- **Playlist list/detail/import backend endpoints** -- `backend/api/urls.py` exposes `/api/playlists/`, `/api/playlists/<id>/`, and `/api/playlists/import/`.
- **Public playlist URL import** -- `backend/api/youtube.py` imports playlist and video metadata from the YouTube Data API v3 using `YOUTUBE_API_KEY`.
- **Database-backed playlists and videos** -- `backend/api/models.py` defines per-user `Playlist` rows and related `Video` rows with uniqueness constraints.
- **Focused backend tests** -- `backend/api/tests.py` covers auth, playlist import, user scoping, re-import behavior, and import error handling.

## Not Implemented On Master Yet

- **YouTube OAuth integration** -- there is no OAuth token model, token encryption utility, OAuth callback/auth-url view, OAuth API client flow, or YouTube disconnect endpoint.
- **Hidden playlist management** -- there are no active `Playlist` fields, serializers, views, routes, or frontend API calls for hide, unhide, hidden playlist listing, or hidden playlist styling.
- **Playlist unlink/disconnect behavior** -- there are no backend routes or frontend controls for unlinking playlists or disconnecting a YouTube account.
- **Per-user database notes** -- there is no `Note` model, note serializer, `/api/notes/<video_id>/` route, or frontend notes API client; notes remain browser-local.
- **Removed-video persistence and UI** -- the active `Video` model and serializers do not expose `is_removed`; the frontend types and video components do not render removed badges, dimmed styling, or watch warnings.
- **Dark/light theme toggle** -- the UI has a fixed dark theme; no theme state, toggle control, or persisted theme preference exists.
- **Obsidian-style Enter markdown behavior** -- notes can be previewed as markdown, but the editor does not transform markdown syntax on Enter.
- **Search and filtering** -- there is no playlist or video search/filter UI or backend query support.
- **Manual playlist refresh/sync** -- imports and re-imports happen through the import endpoint only; there is no dedicated refresh/sync action.
- **AI/Gemini analysis and chat** -- there are no backend or frontend modules for AI analysis, summaries, or chat.
- **Production CORS hardening** -- `backend/config/settings.py` still sets `CORS_ALLOW_ALL_ORIGINS = True`.
- **Settings** -- Different settings option on layout

## Code Surface Checked

- Backend routes: `backend/api/urls.py`
- Backend views: `backend/api/views.py`
- Backend models: `backend/api/models.py`
- Backend serializers: `backend/api/serializers.py`
- YouTube import service: `backend/api/youtube.py`
- Backend tests: `backend/api/tests.py`
- Frontend routes: `frontend/src/App.tsx`
- Frontend playlist API client: `frontend/src/api/playlists.ts`
- Frontend playlist browser/detail/watch pages: `frontend/src/pages/PlaylistBrowser.tsx`, `frontend/src/pages/PlaylistDetail.tsx`, `frontend/src/pages/WatchPage.tsx`
- Frontend player, notes, playlist card, and video list components: `frontend/src/components/`
- Frontend playlist/video types: `frontend/src/types/playlist.ts`
