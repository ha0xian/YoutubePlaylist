# YouTube Playlist Viewer — Plan

## Context

Build a single-user web app that displays the user's YouTube playlists and their videos in a clean, organized layout. Videos are grouped by playlist. The backend syncs playlist/video metadata from YouTube Data API v3 via Google OAuth, stores it locally, and serves it through a REST API. The frontend fetches and displays the data with a sidebar + video grid layout.

- **Backend**: Python Django REST Framework
- **Frontend**: React (Vite)
- **Location**: `C:\Users\NorthWhite\Desktop\Project\Youtube playlist`

---

## Architecture Overview

```
YouTube Data API v3
        │
        ▼
┌──────────────────┐     ┌──────────────────┐
│  Django Backend  │────▶│   React Frontend │
│  (port 8000)     │REST │   (port 5173)    │
│                  │◀────│                  │
│  SQLite DB       │     │  Sidebar + Grid  │
│  OAuth tokens    │     │  Embedded Player │
└──────────────────┘     └──────────────────┘
```

---

## Backend Plan

### Models (`backend/playlists/models.py`)

- **YouTubePlaylist**: `youtube_id`, `title`, `description`, `thumbnail_url`, `item_count`, `synced_at`
- **YouTubeVideo**: `youtube_id`, `playlist` (FK), `title`, `description`, `thumbnail_url`, `position`, `duration`

### YouTube API Client (`backend/playlists/youtube.py`)

- Use `google-api-python-client` with OAuth 2.0 credentials
- `fetch_playlists()` — calls `playlists().list(mine=true)` to get all user playlists
- `fetch_playlist_videos(playlist_id)` — calls `playlistItems().list()` to get videos for a playlist
- `sync_all()` — fetches all playlists, then their videos, upserts into DB
- OAuth flow: single-user model — redirect to Google, store refresh token on disk

### API Endpoints (`backend/playlists/views.py`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/playlists/` | List all synced playlists |
| GET | `/api/playlists/<id>/` | Get playlist details with its videos |
| POST | `/api/sync/` | Trigger a full sync from YouTube |
| GET | `/api/auth/status/` | Check if OAuth is configured |
| GET | `/api/auth/url/` | Get Google OAuth authorization URL |
| GET | `/api/auth/callback/` | OAuth callback to store credentials |

### Settings Highlights

- SQLite database (sufficient for single-user metadata)
- CORS enabled for Vite dev server origin
- `django-rest-framework` + `google-api-python-client` + `google-auth-oauthlib`

### Django Project Setup

- Single app: `playlists`
- Project name: `config`
- Run via `python manage.py runserver`

---

## Frontend Plan

### Tech Stack

- React 19 with Vite 8
- TypeScript (strict mode, `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- React Router v7 for navigation (`/` → playlist browser, `/playlist/:id` → video list, `/watch/:videoId` → player + notes)
- Tailwind CSS v4 + inline styles for dynamic values (dark theme)

### Component Tree

```
App (Routes)
├── PlaylistBrowser     "/" — grid of playlist cards
├── PlaylistDetail      "/playlist/:id" — header + scrollable video list
└── WatchPage           "/watch/:videoId" — 70/30 split layout
    ├── YouTubePlayer   (video ID input + embedded iframe)
    └── MarkdownNotes   (textarea + markdown preview)
```

### Pages

1. **Playlist Browser** (`/`) — Sticky header + responsive grid of PlaylistCard components (1–4 columns depending on viewport)
2. **Playlist Detail** (`/playlist/:id`) — Sticky header with back button + playlist info, scrollable list of VideoListItem components
3. **Watch** (`/watch/:videoId`) — 70% YouTube iframe player + 30% markdown notes panel (persisted to localStorage)
4. **Catch-all** (`*`) — Redirects to `/`

### Data

- `types/playlist.ts` — `Playlist`, `Video`, `Thumbnail` TypeScript interfaces matching YouTube Data API v3 shapes
- `data/mockData.ts` — 6 playlists with 4–8 videos each, using `img.youtube.com/vi/{ID}/mqdefault.jpg` for thumbnails
- Ready to swap with real API calls: `services/api.js` — fetch wrapper calling Django REST endpoints (not yet created)

### Key Features

- Embedded YouTube player (iframe) with video ID input; loads from URL param or localStorage
- Markdown notes editor per video with live preview (uses `marked` library)
- Video duration badge overlay on thumbnails
- Back-button navigation preserves browser history
- Responsive playlist grid and video list
- Dark theme: bg `#0f0f0f`, surfaces `#1a1a1a`/`#2a2a2a`, text `#e0e0e0`, accent `#cc0000`

---

## Implementation Steps

### Step 1: Backend Project Scaffold
- Create Django project (`config`) and app (`playlists`)
- Install dependencies: `django`, `djangorestframework`, `django-cors-headers`, `google-api-python-client`, `google-auth-oauthlib`
- Configure settings (CORS, DRF, database)

### Step 2: Models & Admin
- Define `YouTubePlaylist` and `YouTubeVideo` models
- Run migrations
- Register models in Django admin

### Step 3: YouTube API Integration
- Implement OAuth flow (single-user)
- Implement `youtube.py` with fetch/sync functions
- Implement management command for manual sync

### Step 4: REST API
- Create serializers
- Create views and URL routing
- Wire up sync endpoint

### Step 5: Frontend Scaffold
- Create Vite + React + TypeScript project
- Install `react-router-dom`, `tailwindcss`, `@tailwindcss/vite`, `marked`
- Configure Tailwind CSS v4 Vite plugin
- Set up folder structure (`components/`, `pages/`, `data/`, `types/`)

### Step 6: Frontend Components
- Create `types/playlist.ts` with data interfaces
- Create `data/mockData.ts` with 6 playlists + 34 videos (YouTube-shaped mock data)
- Build `PlaylistCard` (grid card) and `VideoListItem` (row with duration badge) components
- Build `PlaylistBrowser` (grid page), `PlaylistDetail` (video list page), `WatchPage` (player + notes)
- Build `YouTubePlayer` (iframe embed with URL input) and `MarkdownNotes` (textarea + preview)
- Wire up routing in `App.tsx` with `BrowserRouter` in `main.tsx`

### Step 7: Polish & Connect
- Wire frontend to backend `services/api.js` (not yet created)
- Add loading/empty/error states
- Test full flow end-to-end

---

## Verification

1. Run backend: `python manage.py runserver` — confirm API at `http://localhost:8000/api/`
2. Run frontend: `npm run dev` — confirm app at `http://localhost:5173`
3. Complete OAuth flow at `/api/auth/url/`
4. Trigger sync at `/api/sync/` — verify playlists + videos appear in DB
5. Open frontend — verify playlists in sidebar, videos in grid
6. Click a video — verify embedded player opens
7. Click different playlists — verify video grid updates

---

## Files to Create

```
Youtube playlist/
├── backend/
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── playlists/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── youtube.py
│   │   ├── admin.py
│   │   └── migrations/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── YouTubePlayer.tsx
│   │   │   ├── MarkdownNotes.tsx
│   │   │   ├── PlaylistCard.tsx
│   │   │   └── VideoListItem.tsx
│   │   ├── pages/
│   │   │   ├── PlaylistBrowser.tsx
│   │   │   ├── PlaylistDetail.tsx
│   │   │   └── WatchPage.tsx
│   │   ├── data/
│   │   │   └── mockData.ts
│   │   ├── types/
│   │   │   └── playlist.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
```
