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

- React 18 with Vite
- React Router for navigation (`/` → all playlists, `/playlist/:id` → single playlist)
- Plain CSS modules for styling (keep it simple, single-user app)

### Component Tree

```
App
├── Header (app title, sync status, sync button)
├── Layout
│   ├── Sidebar
│   │   └── PlaylistList > PlaylistItem[] (title, thumbnail, video count)
│   └── MainContent
│       ├── VideoGrid > VideoCard[] (thumbnail, title, duration)
│       └── VideoPlayer (embedded YouTube iframe, shown in modal/overlay)
```

### Pages

1. **Home** (`/`) — Sidebar with all playlists + main area showing all videos (or prompt to select a playlist)
2. **Playlist View** (`/playlist/:id`) — Sidebar with highlighted playlist + main area with that playlist's videos

### Data Flow

- `services/api.js` — wrapper around `fetch` to call Django API
- On app load: fetch playlists, display in sidebar
- On playlist click: fetch that playlist's videos, display in grid
- On "Sync" button: call `POST /api/sync/`, then refresh data

### Key Features

- Embedded YouTube player (iframe) opens in a modal when clicking a video card
- Responsive video grid (3-4 columns on desktop, 1-2 on mobile)
- Playlist thumbnails in sidebar
- "Last synced" indicator in header

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
- Create Vite + React project
- Install `react-router-dom`
- Set up folder structure

### Step 6: Frontend Components
- Build `api.js` service layer
- Build `Sidebar` + `PlaylistList`
- Build `VideoGrid` + `VideoCard`
- Build `VideoPlayer` modal
- Build `Header` with sync button
- Wire up routing and data fetching

### Step 7: Polish & Connect
- Wire frontend to backend
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
│   │   │   ├── Header.jsx
│   │   │   ├── Header.css
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Sidebar.css
│   │   │   ├── PlaylistItem.jsx
│   │   │   ├── PlaylistItem.css
│   │   │   ├── VideoGrid.jsx
│   │   │   ├── VideoGrid.css
│   │   │   ├── VideoCard.jsx
│   │   │   ├── VideoCard.css
│   │   │   ├── VideoPlayer.jsx
│   │   │   └── VideoPlayer.css
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
```
