---
feature: youtube-api-integration
slice: 02
area: backend
mode: new
parallel-safe-with: [youtube-api-integration-03, youtube-api-integration-04]
---

# Backend API endpoints: OAuth flow, playlist CRUD, URL import, serializers, and tests

## Goal

Implement all API endpoints for YouTube OAuth (initiate, callback), playlist management (list, hidden list, detail, link by URL, hide, unhide, unlink), YouTube account disconnect, per-user video notes, and the corresponding serializers and tests.

## Files

- `backend/api/views.py` (extend) -- add OAuthInitiateView, OAuthCallbackView, PlaylistListView, HiddenPlaylistListView, PlaylistDetailView, LinkPlaylistByUrlView, HidePlaylistView, UnhidePlaylistView, UnlinkPlaylistView, DisconnectYouTubeView, VideoNoteView
- `backend/api/serializers.py` (extend) -- add PlaylistSerializer, VideoSerializer, LinkPlaylistByUrlSerializer, VideoNoteSerializer
- `backend/api/urls.py` (extend) -- wire all new routes under `/api/youtube/` and `/api/playlists/`
- `backend/api/tests.py` (extend) -- add test classes for OAuth flow, playlist listing, hidden playlist listing, URL linking, hiding, unlinking, disconnect, and video notes

## Interfaces

### Serializers

**PlaylistSerializer** (serializers.ModelSerializer)
- Model: Playlist
- Fields: `id`, `youtube_playlist_id`, `title`, `channel_title`, `thumbnail_url`, `description`, `video_count`, `published_at`, `source_type`, `is_hidden`, `is_unlinked`, `created_at`, `videos` (nested VideoSerializer, read-only)

**VideoSerializer** (serializers.ModelSerializer)
- Model: Video
- Fields: `id`, `youtube_video_id`, `title`, `channel_title`, `duration`, `thumbnail_url`, `published_at`, `view_count`, `position`, `is_removed`

**VideoNoteSerializer** (serializers.ModelSerializer)
- Model: VideoNote
- Fields: `video_id`, `body_markdown`, `updated_at`

**LinkPlaylistByUrlSerializer** (serializers.Serializer)
- Fields: `url` (URLField) -- the YouTube playlist URL (e.g., `https://www.youtube.com/playlist?list=...`)
- Validate: extract `list` query param from URL; reject if missing

### Views (all require TokenAuthentication + IsAuthenticated unless noted)

**OAuthInitiateView** -- `GET /api/youtube/auth-url/`
- Returns the Google OAuth URL the frontend should redirect to
- Response 200: `{ "auth_url": "https://accounts.google.com/o/oauth2/auth?..." }`
- Scopes: `https://www.googleapis.com/auth/youtube.readonly`
- Redirect URI should be read from settings (default: `http://localhost:5173/youtube/callback` for dev)

**OAuthCallbackView** -- `POST /api/youtube/callback/`
- Request body: `{ "code": "authorization_code_from_google" }`
- Calls `youtube_service.exchange_oauth_code(code, redirect_uri)` to get tokens
- Encrypts tokens via `encryption.encrypt_token()` and stores in YouTubeOAuthToken
- On success, immediately fetches the user's playlists via `youtube_service.fetch_playlists(access_token)` and creates/updates Playlist + Video records in the database
- Response 201: `{ "playlists": [serialized playlists], "count": N }`
- Response 400: `{ "detail": "Invalid authorization code." }` if Google rejects

**PlaylistListView** -- `GET /api/playlists/`
- Lists visible, linked Playlists for the current user
- Response 200: list of PlaylistSerializer (summary: no nested videos, just playlist fields)

**HiddenPlaylistListView** -- `GET /api/playlists/hidden/`
- Lists playlists hidden by the current user
- Response 200: list of PlaylistSerializer

**PlaylistDetailView** -- `GET /api/playlists/<id>/`
- Returns playlist with nested videos
- Response 200: PlaylistSerializer with nested videos
- Response 404: if not found or not owned by user

**LinkPlaylistByUrlView** -- `POST /api/playlists/link/`
- Request body: `{ "url": "https://www.youtube.com/playlist?list=PL..." }`
- Extracts playlist ID from URL
- Calls `youtube_service.fetch_playlist_items(settings.YOUTUBE_API_KEY, playlist_id)` then `youtube_service.fetch_video_details(...)` to get full metadata
- Creates (or updates existing) Playlist + Video records for the current user with `source_type='url'`
- If the playlist URL is invalid or not found, returns 400 with `{ "url": "<submitted-url>", "detail": "Invalid or non-existent YouTube playlist URL." }`
- If YOUTUBE_API_KEY is missing, returns 503 with `{ "detail": "YouTube API key not configured." }`
- Response 201: PlaylistSerializer with nested videos
- Response 400: error detail

**HidePlaylistView** -- `POST /api/playlists/<id>/hide/`
- Sets `is_hidden = True` for the current user's playlist
- Response 200: `{ "detail": "Playlist hidden." }`
- Response 404: if not found or not owned by user

**UnhidePlaylistView** -- `POST /api/playlists/<id>/unhide/`
- Sets `is_hidden = False` for the current user's playlist
- Response 200: `{ "detail": "Playlist restored." }`
- Response 404: if not found or not owned by user

**UnlinkPlaylistView** -- `POST /api/playlists/<id>/unlink/`
- Sets `is_unlinked = True` on the Playlist (dissociate semantics -- data stays in DB)
- Response 200: `{ "detail": "Playlist unlinked." }`
- Response 404: if not found or not owned by user

**DisconnectYouTubeView** -- `POST /api/youtube/disconnect/`
- Deletes the user's YouTubeOAuthToken (if exists)
- Sets `is_unlinked = True` on all Playlists with `source_type='oauth'` for this user
- Playlists with `source_type='url'` are preserved (they're not OAuth-linked)
- Response 200: `{ "detail": "YouTube account disconnected." }`

**VideoNoteView** -- `GET/PUT /api/notes/<video_id>/`
- `GET` returns the current user's note for the video, creating an empty note response if none exists
- `PUT` saves `{ "body_markdown": "..." }` for the current user and video
- Notes are scoped by user and video

### URL routing

Add to `backend/api/urls.py`:

```python
urlpatterns += [
    # YouTube OAuth
    path("youtube/auth-url/", views.OAuthInitiateView.as_view(), name="youtube-auth-url"),
    path("youtube/callback/", views.OAuthCallbackView.as_view(), name="youtube-callback"),
    path("youtube/disconnect/", views.DisconnectYouTubeView.as_view(), name="youtube-disconnect"),
    # Playlist CRUD
    path("playlists/", views.PlaylistListView.as_view(), name="playlist-list"),
    path("playlists/hidden/", views.HiddenPlaylistListView.as_view(), name="playlist-hidden-list"),
    path("playlists/link/", views.LinkPlaylistByUrlView.as_view(), name="playlist-link"),
    path("playlists/<int:pk>/", views.PlaylistDetailView.as_view(), name="playlist-detail"),
    path("playlists/<int:pk>/hide/", views.HidePlaylistView.as_view(), name="playlist-hide"),
    path("playlists/<int:pk>/unhide/", views.UnhidePlaylistView.as_view(), name="playlist-unhide"),
    path("playlists/<int:pk>/unlink/", views.UnlinkPlaylistView.as_view(), name="playlist-unlink"),
    path("notes/<int:video_id>/", views.VideoNoteView.as_view(), name="video-note"),
]
```

### Tests (`backend/api/tests.py`)

All test classes extend `APITestCase`. Use `@override_settings` to mock API keys.

**TestOAuthInitiate**
- `GET /api/youtube/auth-url/` returns 200 with `auth_url` that starts with `https://accounts.google.com/`
- Response includes scopes and client_id in the URL

**TestOAuthCallback**
- With valid mock code: returns 201 with `playlists` list (mock the youtube_service calls)
- With empty code: returns 400

**TestPlaylistList**
- Authenticated user with no playlists returns empty list
- Authenticated user with playlists returns them

**TestPlaylistDetail**
- Returns playlist with videos
- Returns 404 for another user's playlist
- Returns 404 for non-existent ID

**TestLinkPlaylistByUrl**
- Valid public URL creates playlist and videos (mock API calls)
- Invalid URL returns 400
- Invalid URL response includes the submitted URL and a clear error message
- Missing API key returns 503
- Duplicate URL updates existing playlist rather than creating duplicate

**TestHidePlaylist**
- Hiding sets `is_hidden = True` on the playlist
- Hidden playlists appear in `GET /api/playlists/hidden/`
- Hiding another user's playlist returns 404

**TestUnhidePlaylist**
- Unhiding sets `is_hidden = False` on the playlist
- Restored playlists appear again in `GET /api/playlists/`
- Unhiding another user's playlist returns 404

**TestUnlinkPlaylist**
- Unlinking sets `is_unlinked = True` on the playlist
- Unlinking another user's playlist returns 404

**TestDisconnectYouTube**
- Disconnecting deletes YouTubeOAuthToken and marks oauth playlists as unlinked
- URL-sourced playlists are NOT affected
- Disconnecting without a linked YouTube account returns 200 (idempotent)

**TestVideoNote**
- GET note returns the current user's note for a video
- PUT note saves markdown for the current user and video
- Notes for another user are not returned

## Acceptance

- [ ] `GET /api/youtube/auth-url/` returns a valid Google OAuth URL with correct scopes and client ID
- [ ] `POST /api/youtube/callback/` with a valid code stores encrypted tokens and fetches YouTube playlists
- [ ] `GET /api/playlists/` returns user's playlists
- [ ] `GET /api/playlists/hidden/` returns user's hidden playlists
- [ ] `GET /api/playlists/<id>/` returns playlist with nested videos
- [ ] `POST /api/playlists/link/` with a valid public YouTube URL imports and caches all videos
- [ ] `POST /api/playlists/<id>/hide/` hides the playlist from the main playlist list
- [ ] `POST /api/playlists/<id>/unhide/` restores the playlist to the main playlist list
- [ ] `POST /api/playlists/<id>/unlink/` sets is_unlinked without removing data
- [ ] `POST /api/youtube/disconnect/` removes OAuth-linked playlists but preserves URL-linked ones
- [ ] `GET/PUT /api/notes/<video_id>/` loads and saves per-user markdown notes
- [ ] Invalid URLs return 400 with the submitted URL and a clear error message
- [ ] All tests pass via `cd backend && python manage.py test`

## Tests

Covered inline above. All test cases live in `backend/api/tests.py`.

## Size

M

## Security

### Findings

1. **OAuth redirect URI validation.** The `OAuthCallbackView` receives an authorization code via `POST /api/youtube/callback/`. The view must validate that the `redirect_uri` used in the token exchange matches exactly the one registered in Google Cloud Console. Storing the redirect URI in settings (as specified in the plan) and using it consistently is correct practice. However, the view should NOT accept a `redirect_uri` from the request body -- an attacker could inject a different URI and steal the authorization code. Only use the server-side configured `settings.GOOGLE_OAUTH_REDIRECT_URI`.

2. **CSRF protection on OAuth callback.** The OAuth callback endpoint (`POST /api/youtube/callback/`) should enforce CSRF protection if session-based authentication is used. Since the plan uses `TokenAuthentication` (token in header), CSRF does not apply. This is correct.

3. **Authorization code replay prevention.** The Google OAuth authorization code is a one-time-use credential. The `OAuthCallbackView` must call `exchange_oauth_code` immediately on receiving the code and not cache it. The plan correctly exchanges the code in the same request. No additional action needed.

4. **Token storage is server-side only.** The plan correctly keeps OAuth tokens server-side after the initial exchange. The frontend never receives the access/refresh tokens -- only the authorization code (which is one-time-use) passes through the frontend redirect. This is the correct architecture.

5. **Error responses must not leak sensitive information.** The `LinkPlaylistByUrlView` should return `{"detail": "Invalid or non-existent YouTube playlist URL."}` for both invalid URLs AND cases where the API key is misconfigured or quota is exceeded -- do NOT differentiate between "playlist not found" and "API quota exceeded" in the response body, as this leaks internal state. Log the real error server-side.

6. **User ownership enforcement.** Every playlist view that takes a `<pk>` parameter must verify `request.user` owns the playlist before returning data. The plan states this for detail/unlink views. Use a `get_object_or_404` queryset filtered by `user=request.user` to ensure the 404 is indistinguishable between "not found" and "not owned".

7. **DisconnectYouTubeView idempotency.** The plan says disconnecting when no YouTube account is linked returns 200 (idempotent). Ensure the view wraps the token deletion in a try/except or uses `filter(...).delete()` rather than `get()` to avoid 500 errors when no token exists.

8. **No rate limiting on link-by-URL.** The `POST /api/playlists/link/` endpoint calls the YouTube Data API, which consumes quota. Consider adding per-user rate limiting (e.g., max 10 URL imports per hour) to prevent quota exhaustion. This is advisory for this slice.

9. **Environment-specific redirect URIs.** The product plan flags this as an open question. The implementation must support different redirect URIs per environment (dev vs prod). Store `GOOGLE_OAUTH_REDIRECT_URI` in the environment/settings, not hardcoded.

### No blockers. Nine findings above are advisory or should-fix level.
