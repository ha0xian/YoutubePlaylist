---
mode: new
---

# YouTube API Integration

## Goal

Allow authenticated users to bring their YouTube playlists into the app through two optional paths: signing in to YouTube via OAuth, or pasting a public YouTube playlist URL. YouTube sign-in is additive to the app's own authentication system. On link/import, playlist and video metadata is fetched upfront and cached in the local database so normal browsing does not depend on live YouTube API calls.

The app should support watching videos, browsing linked playlists, hiding playlists from the main view, and taking per-user notes for each video. Videos later removed from the source YouTube playlist remain in the product playlist and are shown with a user-facing `removed` tag.

## Users

- **Authenticated user** -- links a YouTube account or public playlist URL so they can browse, watch, and take per-video notes.
- **Returning user** -- resumes their linked playlists and database-persisted notes across sessions.

## Acceptance Criteria

- [ ] User can initiate YouTube OAuth sign-in from within the authenticated app and grant permission to view their YouTube playlists
- [ ] YouTube sign-in is separate from app login and remains optional
- [ ] After OAuth success, the user's YouTube playlists appear in the PlaylistBrowser
- [ ] User can paste a public YouTube playlist URL, see the submitted URL during error handling, and receive a clear error if the URL is invalid or missing
- [ ] Playlists linked via OAuth or URL are associated with the user's account, stored in the database, and persist across sessions
- [ ] When a playlist is linked, all available video metadata is fetched from YouTube Data API v3 and stored immediately: title, thumbnail, duration, channel, publish date, and view count
- [ ] Normal playlist/video rendering uses cached database data and does not lazy-load from YouTube
- [ ] User can view a linked playlist's videos and navigate to the WatchPage to play videos
- [ ] User can write per-video markdown notes scoped to their own user account
- [ ] Notes are persisted per video in the database
- [ ] Notes preview is rendered with `marked`
- [ ] Markdown preview applies when the user presses Enter, similar to Obsidian-style editing; for example, starting a line with `#` turns that line into a heading after Enter
- [ ] User can hide a playlist from their main playlist view
- [ ] User can open a hidden playlists page that lists all playlists hidden by that account
- [ ] User can restore/unhide a hidden playlist from the hidden playlists page
- [ ] User can unlink a playlist from their account; cached local data is dissociated but not deleted
- [ ] User can disconnect their YouTube account entirely; OAuth-linked playlists are removed from the user view, while URL-linked playlists are preserved
- [ ] If a video is removed from the source YouTube playlist, it remains visible in the product playlist with a `removed` tag
- [ ] Deleted/removed videos are visually marked, dimmed or struck through, and remain clickable/watchable
- [ ] WatchPage shows a warning for videos removed from the source YouTube playlist
- [ ] YouTube API quota, token, and API errors are logged server-side and surfaced with user-friendly messages
- [ ] There is no live sync on page load
- [ ] Manual refresh is reserved for a future release and is not part of the initial release

## Scope

- **In:**
  - Backend YouTube OAuth flow
  - Backend YouTube Data API v3 integration for fetching playlists, playlist items, and video details
  - Database models for YouTubeOAuthToken, Playlist, Video, and per-user VideoNote
  - Playlist hidden state per user/account
  - Removed-video state for videos no longer present in the source playlist
  - API endpoints for OAuth, playlist list/detail/link/hide/unhide/unlink, hidden playlist listing, YouTube disconnect, and video notes
  - Frontend UI for YouTube OAuth, playlist URL import, visible playlists, hidden playlists, playlist detail, watch page, and notes
  - Dark and light theme UI
  - Theme toggle UI with preference persisted in the browser
  - Responsive playlist grid and responsive video list
  - Back-button navigation preserving browser history
  - Error handling that shows the submitted invalid URL and a clear message
- **Out:**
  - Mock playlist/video data as fallback or transition data
  - Showing mock playlists alongside real playlists
  - Uploading videos to YouTube
  - YouTube comments, likes, subscriptions
  - Real-time sync of playlist changes on page load
  - Searching YouTube from within the app
  - OAuth for other Google services
  - Multi-language / i18n for YouTube-related UI strings
  - Deleting cached playlist data from the database on unlink

## Future / Broader Plans

- AI/Gemini-powered video analysis and chat
- Search and filtering for large playlist libraries and long playlists
- Manual playlist refresh/sync action

## Non-Functional

- **Security**: YouTube OAuth tokens are stored encrypted at rest in the database. Tokens are never exposed to client-side code after the authorization-code exchange.
- **Persistence**: Playlists, videos, hidden state, and notes persist in the database per user.
- **Performance**: Full video metadata is fetched and cached on link/import. Subsequent page loads read from the local database.
- **Observability**: YouTube API errors are logged server-side and surfaced with user-friendly messages.
- **Quota management**: Backend should throttle or otherwise protect quota-heavy import operations. No live YouTube API calls on page load.
- **Credentials**: Google API key and OAuth client ID/secret live in environment configuration. Frontend receives only what it needs to initiate the OAuth redirect.

## Open Questions

- OAuth redirect URI configuration needs one URI per environment in Google Cloud Console.
