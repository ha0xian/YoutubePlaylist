---
feature: youtube-api-integration
slice: 01
area: backend
mode: new
parallel-safe-with: [youtube-api-integration-03, youtube-api-integration-04]
---

# Backend foundation: models, YouTube API service, encryption, and settings

## Goal

Create the database models (YouTubeOAuthToken, Playlist, Video, VideoNote), the YouTube Data API v3 client service, the Fernet-based token encryption utility, and the corresponding Django settings and admin registration.

## Files

- `backend/api/models.py` (extend) -- add YouTubeOAuthToken, Playlist, Video, VideoNote models
- `backend/config/settings.py` (extend) -- add YOUTUBE_API_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY settings loaded from environment variables; add `corsheaders` if not already present for OAuth redirect
- `backend/api/admin.py` (extend) -- register YouTubeOAuthToken, Playlist, Video, VideoNote in admin
- `backend/api/encryption.py` (new) -- Fernet-based encrypt/decrypt helpers for OAuth tokens
- `backend/api/youtube_service.py` (new) -- YouTube Data API v3 client: fetch_playlists, fetch_playlist_items, exchange_oauth_code, refresh_access_token

## Interfaces

### Models

**YouTubeOAuthToken** (stores Google OAuth tokens encrypted at rest, one per user)

| Field | Type | Notes |
|-------|------|-------|
| `user` | OneToOneField(User, on_delete=CASCADE, related_name='youtube_token') | One token set per user |
| `access_token` | BinaryField | Encrypted via Fernet |
| `refresh_token` | BinaryField(null=True, blank=True) | Encrypted via Fernet |
| `token_type` | CharField(max_length=50, default='Bearer') | |
| `expires_at` | DateTimeField(null=True, blank=True) | Token expiry timestamp |
| `created_at` | DateTimeField(auto_now_add=True) | |
| `updated_at` | DateTimeField(auto_now=True) | |

**Playlist** (cached YouTube playlist metadata, linked to a user)

| Field | Type | Notes |
|-------|------|-------|
| `user` | ForeignKey(User, on_delete=CASCADE, related_name='playlists') | |
| `youtube_playlist_id` | CharField(max_length=255) | YouTube's playlist ID |
| `title` | CharField(max_length=500) | |
| `channel_title` | CharField(max_length=500) | |
| `thumbnail_url` | URLField(max_length=1000) | |
| `description` | TextField(blank=True, default='') | |
| `video_count` | IntegerField(default=0) | |
| `published_at` | DateTimeField(null=True, blank=True) | |
| `source_type` | CharField(max_length=10, choices=SourceType.choices) | 'oauth' or 'url' |
| `is_hidden` | BooleanField(default=False) | Hidden from the user's main playlist view |
| `is_unlinked` | BooleanField(default=False) | Dissociated from the user without deleting cached data |
| `created_at` | DateTimeField(auto_now_add=True) | |
| `updated_at` | DateTimeField(auto_now=True) | |

- Meta: `unique_together = ('user', 'youtube_playlist_id')`
- SourceType choices: `OAUTH = 'oauth'`, `URL = 'url'`

**Video** (cached YouTube video metadata per playlist)

| Field | Type | Notes |
|-------|------|-------|
| `playlist` | ForeignKey(Playlist, on_delete=CASCADE, related_name='videos') | |
| `youtube_video_id` | CharField(max_length=255) | YouTube's video ID |
| `title` | CharField(max_length=500) | |
| `channel_title` | CharField(max_length=500) | |
| `duration` | CharField(max_length=50) | ISO 8601 duration from API |
| `thumbnail_url` | URLField(max_length=1000) | |
| `published_at` | DateTimeField(null=True, blank=True) | |
| `view_count` | BigIntegerField(default=0) | |
| `position` | IntegerField(default=0) | Order within playlist |
| `is_removed` | BooleanField(default=False) | Video was removed from the source YouTube playlist |
| `created_at` | DateTimeField(auto_now_add=True) | |

- Meta: `unique_together = ('playlist', 'youtube_video_id')`, `ordering = ['position']`

**VideoNote** (per-user markdown notes for a video)

| Field | Type | Notes |
|-------|------|-------|
| `user` | ForeignKey(User, on_delete=CASCADE, related_name='video_notes') | Note owner |
| `video` | ForeignKey(Video, on_delete=CASCADE, related_name='notes') | Video being annotated |
| `body_markdown` | TextField(blank=True, default='') | Raw markdown note content |
| `created_at` | DateTimeField(auto_now_add=True) | |
| `updated_at` | DateTimeField(auto_now=True) | |

- Meta: `unique_together = ('user', 'video')`

### Encryption utility (`encryption.py`)

```python
from cryptography.fernet import Fernet
from django.conf import settings

def get_fernet() -> Fernet:
    return Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())

def encrypt_token(plain_text: str) -> bytes:
    return get_fernet().encrypt(plain_text.encode())

def decrypt_token(cipher_text: bytes) -> str:
    return get_fernet().decrypt(cipher_text).decode()
```

### YouTube service (`youtube_service.py`)

```python
def fetch_playlists(access_token: str) -> list[dict]:
    """GET https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet,contentDetails
    Returns list of playlist dicts from API."""

def fetch_playlist_items(api_key: str, playlist_id: str) -> list[dict]:
    """GET https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId={id}&key={api_key}
    Paginates through all pages. Returns list of video item dicts."""

def fetch_video_details(api_key: str, video_ids: list[str]) -> list[dict]:
    """GET https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id={comma_sep_ids}&key={api_key}
    Fetches duration, viewCount for batch of up to 50 video IDs."""

def exchange_oauth_code(code: str, redirect_uri: str) -> dict:
    """POST https://oauth2.googleapis.com/token with authorization_code grant.
    Returns {'access_token', 'refresh_token', 'expires_in', 'token_type'}."""

def refresh_access_token(refresh_token: str) -> dict:
    """POST https://oauth2.googleapis.com/token with refresh_token grant.
    Returns {'access_token', 'expires_in', 'token_type'}."""

def format_duration(iso_duration: str) -> str:
    """Convert ISO 8601 duration (PT1H2M3S) to human-readable string (1:02:03)."""
```

### Settings additions

Add to `backend/config/settings.py`:

```python
# YouTube / Google OAuth
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')
GOOGLE_OAUTH_CLIENT_ID = os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '')
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')
# Fernet key for encrypting OAuth tokens at rest (32-url-safe-base64 bytes)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
TOKEN_ENCRYPTION_KEY = os.environ.get('TOKEN_ENCRYPTION_KEY', '')
```

Ensure `os` is imported at top of settings.py. Add `'corsheaders'` to `INSTALLED_APPS` if not already present (check existing file).

## Acceptance

- [ ] `python manage.py makemigrations` produces a migration for YouTubeOAuthToken, Playlist, Video, VideoNote
- [ ] `python manage.py migrate` succeeds
- [ ] All four new models are visible in Django admin
- [ ] `encrypt_token('test')` followed by `decrypt_token(...)` returns `'test'`
- [ ] `youtube_service.py` functions can be imported without error

## Tests

No endpoint tests in this slice (slice 02 covers them). Verify models with a shell check: create a Playlist and Video via the ORM, confirm relationships work.

## Size

M

## Security

### Findings

1. **Fernet key must be a valid 32-byte URL-safe base64 key.** Django settings currently loads TOKEN_ENCRYPTION_KEY as a string from the environment. The Fernet constructor (`cryptography.fernet.Fernet(key)`) requires exactly a 32-byte URL-safe base64-encoded key. If the environment variable is missing or malformed, Fernet will raise an `InvalidToken` or `ValueError` at first encrypt/decrypt call. The `encryption.py` module should validate the key at import time and raise a clear `ImproperlyConfigured` error if the key is missing or invalid, not fail silently at encrypt/decrypt time.

2. **`OneToOneField` for YouTubeOAuthToken means a user can only have one Google account linked.** This matches the product plan (per-user token, disconnect-and-reconnect semantics). Ensure the view in Slice 02 uses `get_or_create` or `update_or_create` on the token so re-linking (OAuth re-auth) does not crash with an integrity error.

3. **`BinaryField` for encrypted tokens -- encoding matters.** Django's `BinaryField` returns `bytes` from the database. The `encrypt_token` function returns `bytes` and `decrypt_token` accepts `bytes`. Ensure the field definition uses `editable=False` so it never appears in forms/admin forms, and add a custom admin read-only display method for the token (showing only `[encrypted]` or a masked fragment) to prevent accidental exposure in the admin interface.

4. **YouTube Data API key is stored in plaintext in settings.** The `YOUTUBE_API_KEY` setting is loaded from an environment variable and stored in the Django settings object. This is acceptable for a server-side-only key, but ensure the key is never exposed to the frontend (no API endpoint returns it, no template context includes it). The model admin should not expose it.

5. **No rate limiting on YouTube API calls.** The `youtube_service.py` functions directly call the Google APIs. Consider adding a simple in-memory rate limiter (e.g., `django.core.cache` with a TTL) to enforce per-user or global rate limits and prevent accidental quota exhaustion during development. This is advisory for this slice but should be noted.

6. **`duration` field stores ISO 8601 string, not parsed seconds.** The `duration` CharField stores the raw ISO 8601 duration (e.g., `PT1H2M3S`). This is fine for display purposes but consider adding a second `duration_seconds` IntegerField if sorting or filtering by duration is ever needed downstream. No change needed for this slice.

7. **Migration ordering.** The new models (YouTubeOAuthToken, Playlist, Video) reference User (from `django.contrib.auth`) via ForeignKey. The existing migration `0001_initial.py` creates UserProfile. The new migration must be `0002_*` and should not depend on any circular references. Run `makemigrations` after adding models and verify the dependency chain is correct.

### No blockers. Seven findings above are advisory or should-fix level.
