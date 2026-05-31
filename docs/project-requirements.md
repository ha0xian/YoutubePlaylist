# YouTube Playlist Viewer Requirements

## Context

Build a web app for authenticated users to import, browse, watch, and take notes on their YouTube playlists. Videos are grouped by playlist. The backend imports playlist/video metadata from YouTube Data API v3 through either Google OAuth or a public playlist URL, stores it locally, and serves it through a REST API. The frontend displays playlists, videos, an embedded player, and per-user notes.

- Backend: Python Django REST Framework
- Frontend: React (Vite)
- Location: `C:\Users\NorthWhite\Desktop\Project\Youtube playlist`

## Core App

- YouTube playlist viewer web app
- Playlist browser page
- Playlist detail page with video list
- Watch page with embedded YouTube player
- Per-video markdown notes scoped per user
- Notes live preview using `marked`
- Markdown preview behavior should apply when the user presses Enter, similar to Obsidian-style editing; for example, starting a line with `#` turns that line into a heading after Enter
- Notes persisted per video in the database
- Responsive playlist grid
- Responsive video list
- Dark and light theme UI
- Theme toggle UI
- Theme preference persists in the browser
- Back-button navigation preserving browser history

## YouTube Playback

- Embedded YouTube iframe player
- Video loads from URL route parameter
- Video ID input
- Video can load from `localStorage`
- Video duration badge over thumbnails

## YouTube Playlist Import

- Optional YouTube OAuth sign-in
- YouTube sign-in is separate from app login
- Import user's YouTube playlists after OAuth
- Public playlist URL import
- Import all videos when a playlist is linked
- Cache playlist metadata locally
- Cache video metadata locally
- Store title, thumbnail, duration, channel, publish date, and view count
- No lazy loading from YouTube during normal page display
- Invalid or missing playlist URLs show the submitted URL and a clear error message
- Handle YouTube API quota, token, and API errors with user-friendly messages
- No live sync on page load
- Manual refresh action is future-only, not part of the initial release

## Playlist Management

- List synced/linked playlists
- Get playlist details with videos
- Link playlist by URL
- Hide playlist from account
- Hidden playlists page showing all hidden playlists for the current account
- Hidden playlists can be restored/unhidden
- Unlinking dissociates data but does not delete it
- Disconnect YouTube account
- Disconnect removes OAuth-linked playlists from the user view
- URL-linked playlists are preserved after disconnect
- Playlists persist across sessions
- Playlist source badges: OAuth YouTube and URL link
- Deleted/hidden playlist visual styling
- Videos deleted from the actual YouTube playlist stay in the product playlist with a `removed` tag

## Deleted Video Handling

- Videos deleted from the source YouTube playlist remain in the app
- Deleted videos are marked visually
- Deleted video badge
- Dimmed/strikethrough deleted video styling
- Deleted videos remain clickable/watchable
- Watch page warning for deleted YouTube videos
- Deleted videos should use the user-facing label `removed`

## Backend Features

- User registration, login, and current-user profile endpoint
- Per-user GUID/UUID
- Token-based app authentication
- YouTube OAuth token storage per user
- Encrypted YouTube OAuth tokens at rest
- Playlist, video, and note persistence in the database
- Playlist ownership per user
- Hidden/dissociated playlist state without deleting cached data
- Soft-delete or removed state for videos that disappear from the source YouTube playlist

## Main API Surface

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/playlists/` | List the current user's visible playlists |
| `GET` | `/api/playlists/hidden/` | List the current user's hidden playlists |
| `GET` | `/api/playlists/<id>/` | Get playlist details with videos |
| `POST` | `/api/playlists/link/` | Link/import a public YouTube playlist URL |
| `POST` | `/api/playlists/<id>/hide/` | Hide a playlist from the user's main playlist view |
| `POST` | `/api/playlists/<id>/unlink/` | Dissociate a playlist without deleting cached data |
| `GET` | `/api/youtube/auth-url/` | Get Google OAuth authorization URL |
| `POST` | `/api/youtube/callback/` | Exchange OAuth code and import playlists |
| `POST` | `/api/youtube/disconnect/` | Disconnect the user's YouTube account |
| `GET` | `/api/notes/<video_id>/` | Get the current user's note for a video |
| `PUT` | `/api/notes/<video_id>/` | Save the current user's note for a video |

## Out of Scope

- Mock playlist/video data as fallback or transition data
- Showing mock playlists alongside real playlists
- Uploading videos to YouTube
- YouTube comments, likes, or subscriptions
- Searching YouTube from within the app
- OAuth for other Google services
- Real-time sync on page load

## Future / Broader Plans

- AI/Gemini-powered video analysis and chat
- Search and filtering for large playlist libraries and long playlists
- Manual playlist refresh/sync action
