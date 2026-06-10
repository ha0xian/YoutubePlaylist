"""YouTube OAuth helpers — authorization URL, code exchange, token
storage, refresh, channel profile, and playlist import.

All functions that talk to Google / YouTube accept a ``requests.Session``
as their last parameter so tests can inject a mock session.  When the
session is omitted a default ``requests`` session (with a 30 s timeout)
is used.
"""

import json
import time
from typing import Optional

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.db import transaction
from django.utils import timezone

from .encryption import (
    TokenEncryptionError,
    encrypt_token,
    decrypt_token,
    is_token_encryption_configured,
)
from .models import Playlist, Video, YouTubeOAuthToken
from .youtube import (
    PlaylistImportError,
    YouTubeAPIError,
    _fetch_playlist_items,
    _fetch_video_details,
    _parse_iso_duration,
    _iso_to_datetime,
    reconcile_playlist_videos,
)

# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class YouTubeOAuthConfigError(Exception):
    """Required OAuth settings are missing or invalid."""


class YouTubeOAuthError(Exception):
    """OAuth flow, token exchange, or API error from Google / YouTube."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _oauth_client_id() -> str:
    cid = settings.YOUTUBE_OAUTH_CLIENT_ID
    if not cid:
        raise YouTubeOAuthConfigError("YouTube OAuth client ID is not configured.")
    return cid


def _oauth_client_secret() -> str:
    sec = settings.YOUTUBE_OAUTH_CLIENT_SECRET
    if not sec:
        raise YouTubeOAuthConfigError(
            "YouTube OAuth client secret is not configured."
        )
    return sec


def _oauth_redirect_uri() -> str:
    uri = settings.YOUTUBE_OAUTH_REDIRECT_URI
    if not uri:
        raise YouTubeOAuthConfigError(
            "YouTube OAuth redirect URI is not configured."
        )
    return uri


def _ensure_encryption() -> None:
    if not is_token_encryption_configured():
        raise YouTubeOAuthConfigError(
            "YouTube token encryption key is not configured."
        )


def _google_post(url: str, data: dict, session=None) -> dict:
    """POST to a Google OAuth endpoint and return parsed JSON.

    Uses the given *session* (or a default ``requests`` session) so that
    unit tests can inject a mocked session.
    """
    s = session or requests
    try:
        resp = s.post(url, data=data, timeout=30)
    except requests.RequestException as exc:
        raise YouTubeOAuthError(
            f"Google token endpoint request failed: {exc}"
        ) from exc
    if not resp.ok:
        error_detail = "unknown error"
        try:
            error_detail = resp.json().get("error_description", error_detail)
        except Exception:
            try:
                error_detail = resp.text[:200]
            except Exception:
                pass
        raise YouTubeOAuthError(
            f"Google token endpoint returned {resp.status_code}: {error_detail}"
        )
    return resp.json()


def _now_utc():
    return timezone.now()


def _epoch_seconds_utc():
    return int(time.time())


# ---------------------------------------------------------------------------
# State signing / validation
# ---------------------------------------------------------------------------

# Internal salt so signed values are not interchangeable with other Django
# signing uses.
_STATE_SALT = "youtube_oauth_state"


def _sign_state(user_id: int) -> str:
    """Produce a signed, timestamped, user-specific OAuth state string."""
    signer = TimestampSigner(salt=_STATE_SALT)
    payload = json.dumps({"uid": user_id, "ts": _epoch_seconds_utc()})
    return signer.sign(payload)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_authorization_url(user_id: int) -> dict[str, str]:
    """Return ``{"auth_url": "...", "state": "..."}`` for the given user.

    Requires ``YOUTUBE_OAUTH_CLIENT_ID``, ``YOUTUBE_OAUTH_REDIRECT_URI``,
    and ``YOUTUBE_TOKEN_ENCRYPTION_KEY`` to be configured.
    """
    _ensure_encryption()
    client_id = _oauth_client_id()
    redirect_uri = _oauth_redirect_uri()
    scopes = settings.YOUTUBE_OAUTH_SCOPES

    state = _sign_state(user_id)

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    qs_parts = []
    for k, v in params.items():
        qs_parts.append(f"{k}={requests.utils.quote(v, safe='')}")
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + "&".join(qs_parts)

    return {"auth_url": auth_url, "state": state}


def validate_oauth_state(
    state: str,
    expected_user_id: int,
    max_age: int = 600,
) -> dict:
    """Validate a signed OAuth state string.

    Returns the decoded payload on success.  Raises ``YouTubeOAuthError``
    when the state is missing, expired, tampered, or belongs to a different
    user.
    """
    if not state:
        raise YouTubeOAuthError("Missing OAuth state parameter.")

    signer = TimestampSigner(salt=_STATE_SALT)
    try:
        raw = signer.unsign(state, max_age=max_age)
    except SignatureExpired:
        raise YouTubeOAuthError("OAuth state has expired. Please try again.")
    except BadSignature:
        raise YouTubeOAuthError("Invalid OAuth state. Please try again.")

    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        raise YouTubeOAuthError("Invalid OAuth state payload.")

    uid = payload.get("uid")
    if uid != expected_user_id:
        raise YouTubeOAuthError(
            "OAuth state does not match the current user. "
            "Please start the connection flow again."
        )

    return payload


def exchange_code_for_tokens(code: str, session=None) -> dict:
    """Exchange an authorization code for a Google token payload.

    Does **not** persist anything — call ``store_oauth_tokens_for_user``
    afterwards.
    """
    if not code:
        raise YouTubeOAuthError("Missing authorization code.")

    client_id = _oauth_client_id()
    client_secret = _oauth_client_secret()
    redirect_uri = _oauth_redirect_uri()

    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    return _google_post("https://oauth2.googleapis.com/token", payload, session=session)


def store_oauth_tokens_for_user(
    user: User,
    token_payload: dict,
) -> YouTubeOAuthToken:
    """Encrypt and persist the tokens from a Google token response.

    If the user already has a token row it is updated.  If the new payload
    lacks a ``refresh_token`` an existing refresh token is preserved.
    """
    _ensure_encryption()

    access_token = token_payload.get("access_token", "")
    if not access_token:
        raise YouTubeOAuthError("Token payload is missing access_token.")

    refresh_token = token_payload.get("refresh_token", "")

    expires_in = token_payload.get("expires_in", 0)
    expires_at = None
    if expires_in:
        expires_at = _now_utc() + timezone.timedelta(seconds=int(expires_in))

    try:
        encrypted_access = encrypt_token(access_token)
        encrypted_refresh = encrypt_token(refresh_token) if refresh_token else ""
    except TokenEncryptionError as exc:
        raise YouTubeOAuthError(str(exc)) from exc

    scopes = token_payload.get("scope", "")

    existing = YouTubeOAuthToken.objects.filter(user=user).first()

    if existing:
        existing.encrypted_access_token = encrypted_access
        existing.token_type = token_payload.get("token_type", "Bearer")
        existing.expires_at = expires_at
        existing.scopes = scopes

        # Preserve existing refresh token if new payload doesn't provide one
        if encrypted_refresh:
            existing.encrypted_refresh_token = encrypted_refresh
        # else: keep the old encrypted_refresh_token

        existing.save(update_fields=[
            "encrypted_access_token",
            "encrypted_refresh_token",
            "token_type",
            "expires_at",
            "scopes",
            "updated_at",
        ])
        return existing

    row = YouTubeOAuthToken.objects.create(
        user=user,
        encrypted_access_token=encrypted_access,
        encrypted_refresh_token=encrypted_refresh,
        token_type=token_payload.get("token_type", "Bearer"),
        expires_at=expires_at,
        scopes=scopes,
    )
    return row


def get_valid_access_token(user: User) -> str:
    """Return a currently-valid access token for *user*.

    Refreshes the token automatically when a refresh token is available
    and the access token is close to expiring.
    """
    try:
        row = YouTubeOAuthToken.objects.get(user=user)
    except YouTubeOAuthToken.DoesNotExist:
        raise YouTubeOAuthError("User is not connected to YouTube.")

    # Refresh if within 60 seconds of expiry
    if row.expires_at and row.expires_at <= _now_utc() + timezone.timedelta(seconds=60):
        return refresh_access_token(row)

    return decrypt_token(row.encrypted_access_token)


def refresh_access_token(token_row: YouTubeOAuthToken, session=None) -> str:
    """Refresh an expired access token using the stored refresh token.

    Updates *token_row* in-place and returns the new access token.
    """
    refresh_token = decrypt_token(token_row.encrypted_refresh_token)
    if not refresh_token:
        raise YouTubeOAuthError(
            "Access token has expired and no refresh token is available. "
            "Please reconnect your YouTube account."
        )

    client_id = _oauth_client_id()
    client_secret = _oauth_client_secret()

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    try:
        data = _google_post(
            "https://oauth2.googleapis.com/token", payload, session=session
        )
    except YouTubeOAuthError as exc:
        raise YouTubeOAuthError(
            f"Failed to refresh access token: {exc}"
        ) from exc

    new_access_token = data.get("access_token", "")
    if not new_access_token:
        raise YouTubeOAuthError(
            "Token refresh response did not include a new access_token."
        )

    try:
        token_row.encrypted_access_token = encrypt_token(new_access_token)
    except TokenEncryptionError as exc:
        raise YouTubeOAuthError(str(exc)) from exc

    expires_in = data.get("expires_in", 0)
    if expires_in:
        token_row.expires_at = _now_utc() + timezone.timedelta(
            seconds=int(expires_in)
        )

    # Google *may* return a new refresh token on rotation; use it if present
    new_refresh = data.get("refresh_token", "")
    if new_refresh:
        try:
            token_row.encrypted_refresh_token = encrypt_token(new_refresh)
        except TokenEncryptionError as exc:
            raise YouTubeOAuthError(str(exc)) from exc

    token_row.save(update_fields=[
        "encrypted_access_token",
        "encrypted_refresh_token",
        "expires_at",
        "updated_at",
    ])

    return new_access_token


def fetch_oauth_channel_profile(access_token: str, session=None) -> dict:
    """Fetch the authenticated user's YouTube channel snippet.

    Returns ``{"channel_id": "...", "channel_title": "..."}``.
    """
    s = session or requests
    try:
        resp = s.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={
                "part": "snippet",
                "mine": "true",
            },
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise YouTubeOAuthError(
            f"YouTube channels.list request failed: {exc}"
        ) from exc
    if not resp.ok:
        raise YouTubeOAuthError(
            f"YouTube channels.list returned {resp.status_code}: "
            f"{resp.text[:200]}"
        )

    data = resp.json()
    items = data.get("items", [])
    if not items:
        raise YouTubeOAuthError(
            "No YouTube channel found for this account."
        )

    snippet = items[0].get("snippet", {})
    return {
        "channel_id": items[0].get("id", ""),
        "channel_title": snippet.get("title", ""),
    }


# ── OAuth-aware YouTube Data API helpers ───────────────────────────────


def _oauth_get(url: str, params: dict, access_token: str, session=None) -> dict:
    """GET a YouTube Data API v3 endpoint using OAuth Bearer authorization."""
    s = session or requests
    try:
        resp = s.get(
            url,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
    except requests.RequestException as exc:
        raise YouTubeAPIError(
            f"YouTube API request to {url} failed: {exc}"
        ) from exc

    endpoint = url.rstrip("/").rsplit("/", 1)[-1]

    def _error_detail() -> str:
        try:
            error = resp.json().get("error", {})
            message = error.get("message", "")
            errors = error.get("errors", [])
            reason = ""
            if errors:
                reason = errors[0].get("reason", "")
            if message and reason:
                return f"{message} ({reason})"
            return message or reason or "Unknown YouTube API error."
        except Exception:
            text = getattr(resp, "text", "")
            return text[:200] if text else "Unknown YouTube API error."

    if resp.status_code == 403:
        raise YouTubeAPIError(
            "YouTube API quota exceeded or access is forbidden. "
            "Please check your account permissions."
        )
    if not resp.ok:
        raise YouTubeAPIError(
            f"YouTube {endpoint} request failed with status "
            f"{resp.status_code}: {_error_detail()}"
        )

    data = resp.json()
    if "error" in data:
        message = data["error"].get("message", "Unknown YouTube API error.")
        raise YouTubeAPIError(f"YouTube API error: {message}")

    return data


def _fetch_oauth_playlists(access_token: str, session=None) -> list[dict]:
    """Fetch all playlists for the authenticated user (paginated)."""
    playlists = []
    page_token = None

    while True:
        params = {
            "part": "snippet,contentDetails",
            "mine": "true",
            "maxResults": 50,
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            data = _oauth_get(
                "https://www.googleapis.com/youtube/v3/playlists",
                params,
                access_token,
                session=session,
            )
        except YouTubeAPIError as exc:
            detail = str(exc)
            if "channelNotFound" in detail or "Channel not found" in detail:
                return []
            raise
        playlists.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return playlists


def _fetch_oauth_playlists_by_ids(
    playlist_ids: list[str],
    access_token: str,
    session=None,
) -> list[dict]:
    """Fetch playlist metadata for the selected YouTube playlist IDs."""
    playlists: list[dict] = []

    for i in range(0, len(playlist_ids), 50):
        batch = playlist_ids[i : i + 50]
        data = _oauth_get(
            "https://www.googleapis.com/youtube/v3/playlists",
            {
                "part": "snippet,contentDetails",
                "id": ",".join(batch),
                "maxResults": 50,
            },
            access_token,
            session=session,
        )
        playlists.extend(data.get("items", []))

    return playlists


def _fetch_oauth_playlist_items(
    playlist_id: str,
    access_token: str,
    session=None,
) -> list[dict]:
    """Fetch all items for an OAuth playlist (paginated)."""
    items = []
    page_token = None

    while True:
        params = {
            "part": "snippet,contentDetails",
            "playlistId": playlist_id,
            "maxResults": 50,
        }
        if page_token:
            params["pageToken"] = page_token

        data = _oauth_get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params,
            access_token,
            session=session,
        )
        items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def _fetch_oauth_video_details(
    video_ids: list[str],
    access_token: str,
    session=None,
) -> dict[str, dict]:
    """Fetch video details using OAuth (batches of 50)."""
    details: dict[str, dict] = {}

    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        data = _oauth_get(
            "https://www.googleapis.com/youtube/v3/videos",
            {
                "part": "contentDetails,statistics,snippet",
                "id": ",".join(batch),
            },
            access_token,
            session=session,
        )
        for item in data.get("items", []):
            details[item["id"]] = item

    return details


# ── OAuth playlist import ──────────────────────────────────────────────


def _thumbnail_url(snippet: dict, preferred: str = "medium") -> str:
    thumbnails = snippet.get("thumbnails", {})
    return (
        thumbnails.get(preferred, {}).get("url")
        or thumbnails.get("default", {}).get("url")
        or ""
    )


def _remote_playlist_choice(
    playlist_data: dict,
    imported_by_id: dict[str, Playlist],
) -> dict:
    pl_id = playlist_data.get("id", "")
    snippet = playlist_data.get("snippet", {})
    content_details = playlist_data.get("contentDetails", {})
    local_playlist = imported_by_id.get(pl_id)

    return {
        "youtube_playlist_id": pl_id,
        "title": snippet.get("title", ""),
        "channel_title": snippet.get("channelTitle", ""),
        "thumbnail_url": _thumbnail_url(snippet),
        "description": snippet.get("description", ""),
        "published_at": snippet.get("publishedAt"),
        "video_count": content_details.get("itemCount", 0),
        "is_imported": local_playlist is not None,
        "local_playlist_id": local_playlist.id if local_playlist else None,
        "source": local_playlist.source if local_playlist else None,
    }


def list_remote_playlists_for_user(user: User) -> list[dict]:
    """List available YouTube playlists for the connected account."""
    access_token = get_valid_access_token(user)
    oauth_playlists = _fetch_oauth_playlists(access_token)
    playlist_ids = [
        playlist.get("id", "")
        for playlist in oauth_playlists
        if playlist.get("id", "")
    ]
    imported_by_id = {
        playlist.youtube_playlist_id: playlist
        for playlist in Playlist.objects.filter(
            user=user,
            youtube_playlist_id__in=playlist_ids,
        )
    }

    return [
        _remote_playlist_choice(playlist, imported_by_id)
        for playlist in oauth_playlists
        if playlist.get("id", "")
    ]


def _playlist_video_payloads(
    playlist_id: str,
    access_token: str,
    session=None,
) -> tuple[dict[int, dict], dict[str, dict]]:
    items_data = _fetch_oauth_playlist_items(
        playlist_id, access_token, session=session
    )

    item_video_map: dict[int, dict] = {}
    video_ids: list[str] = []
    for item in items_data:
        item_snippet = item.get("snippet", {})
        resource_id = item_snippet.get("resourceId", {})
        video_id = resource_id.get("videoId")
        if not video_id:
            continue

        position = item_snippet.get("position", 0)
        item_video_map[position] = {
            "video_id": video_id,
            "title": item_snippet.get("title", ""),
            "channel_title": item_snippet.get("channelTitle", ""),
            "thumbnail_url": _thumbnail_url(item_snippet, preferred="default"),
            "published_at": item_snippet.get("publishedAt"),
        }
        video_ids.append(video_id)

    video_details: dict[str, dict] = {}
    if video_ids:
        try:
            video_details = _fetch_oauth_video_details(
                video_ids, access_token, session=session
            )
        except YouTubeAPIError:
            pass

    return item_video_map, video_details


def _persist_oauth_playlist(
    user: User,
    playlist_data: dict,
    item_video_map: dict[int, dict],
    video_details: dict[str, dict],
) -> Playlist:
    pl_id = playlist_data.get("id", "")
    snippet = playlist_data.get("snippet", {})
    content_details = playlist_data.get("contentDetails", {})

    with transaction.atomic():
        existing = Playlist.objects.filter(
            user=user,
            youtube_playlist_id=pl_id,
        ).first()

        if existing and existing.source == "url":
            existing.title = snippet.get("title", existing.title)
            existing.channel_title = snippet.get(
                "channelTitle", existing.channel_title
            )
            existing.thumbnail_url = (
                _thumbnail_url(snippet) or existing.thumbnail_url
            )
            existing.description = snippet.get(
                "description", existing.description
            )
            existing.published_at = _iso_to_datetime(
                snippet.get("publishedAt")
            ) or existing.published_at
            existing.video_count = content_details.get(
                "itemCount", existing.video_count
            )
            existing.save(
                update_fields=[
                    "title",
                    "channel_title",
                    "thumbnail_url",
                    "description",
                    "published_at",
                    "video_count",
                    "updated_at",
                ]
            )
            playlist = existing
        else:
            defaults = {
                "title": snippet.get("title", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "thumbnail_url": _thumbnail_url(snippet),
                "description": snippet.get("description", ""),
                "published_at": _iso_to_datetime(snippet.get("publishedAt")),
                "video_count": content_details.get("itemCount", 0),
                "source": "oauth",
            }
            playlist, _ = Playlist.objects.update_or_create(
                user=user,
                youtube_playlist_id=pl_id,
                defaults=defaults,
            )

        reconcile_playlist_videos(playlist, item_video_map, video_details)
        return playlist


def import_selected_oauth_playlists_for_user(
    user: User,
    playlist_ids: list[str],
) -> tuple[list[Playlist], int]:
    """Import only the selected YouTube OAuth playlists for *user*."""
    if not isinstance(playlist_ids, list):
        raise YouTubeOAuthError("playlist_ids must be a list.")

    selected_ids: list[str] = []
    seen: set[str] = set()
    for playlist_id in playlist_ids:
        if not isinstance(playlist_id, str) or not playlist_id.strip():
            raise YouTubeOAuthError("playlist_ids must contain only strings.")
        normalized = playlist_id.strip()
        if normalized not in seen:
            selected_ids.append(normalized)
            seen.add(normalized)

    access_token = get_valid_access_token(user)
    selected_set = set(selected_ids)

    imported: list[Playlist] = []
    if not selected_ids:
        Playlist.objects.filter(user=user, source="oauth").delete()
        return imported, 0

    oauth_playlists = _fetch_oauth_playlists_by_ids(selected_ids, access_token)
    for pl_data in oauth_playlists:
        pl_id = pl_data.get("id", "")
        if pl_id not in selected_set:
            continue

        item_video_map, video_details = _playlist_video_payloads(
            pl_id, access_token
        )
        imported.append(
            _persist_oauth_playlist(
                user, pl_data, item_video_map, video_details
            )
        )

    Playlist.objects.filter(user=user, source="oauth").exclude(
        youtube_playlist_id__in=selected_set
    ).delete()

    return imported, len(imported)


def import_oauth_playlists_for_user(
    user: User,
    session=None,
) -> int:
    """Import YouTube playlists for *user* using their stored OAuth token.

    Returns the number of playlists imported or updated.
    """
    access_token = get_valid_access_token(user)

    # Fetch playlists
    try:
        oauth_playlists = _fetch_oauth_playlists(access_token, session=session)
    except YouTubeAPIError:
        raise
    except Exception as exc:
        raise YouTubeAPIError(
            f"Failed to fetch OAuth playlists: {exc}"
        ) from exc

    imported_count = 0

    for pl_data in oauth_playlists:
        pl_id = pl_data.get("id", "")
        if not pl_id:
            continue

        snippet = pl_data.get("snippet", {})
        content_details = pl_data.get("contentDetails", {})

        # Fetch playlist items
        try:
            items_data = _fetch_oauth_playlist_items(
                pl_id, access_token, session=session
            )
        except YouTubeAPIError:
            # Skip this playlist on item fetch failure — don't fail the
            # entire import.
            continue
        except Exception:
            continue

        # Collect video metadata from playlist items
        item_video_map: dict[int, dict] = {}
        video_ids: list[str] = []
        for item in items_data:
            item_snippet = item.get("snippet", {})
            resource_id = item_snippet.get("resourceId", {})
            video_id = resource_id.get("videoId")
            if not video_id:
                continue

            position = item_snippet.get("position", 0)
            item_video_map[position] = {
                "video_id": video_id,
                "title": item_snippet.get("title", ""),
                "channel_title": item_snippet.get("channelTitle", ""),
                "thumbnail_url": (
                    item_snippet.get("thumbnails", {})
                    .get("default", {})
                    .get("url", "")
                ),
                "published_at": item_snippet.get("publishedAt"),
            }
            video_ids.append(video_id)

        # Batch-fetch video details
        video_details: dict[str, dict] = {}
        if video_ids:
            try:
                video_details = _fetch_oauth_video_details(
                    video_ids, access_token, session=session
                )
            except YouTubeAPIError:
                pass  # Proceed with item-level metadata only
            except Exception:
                pass

        with transaction.atomic():
            # Determine source: preserve "url" if it already exists
            existing = Playlist.objects.filter(
                user=user,
                youtube_playlist_id=pl_id,
            ).first()

            if existing and existing.source == "url":
                # Update metadata but keep source="url"
                existing.title = snippet.get("title", existing.title)
                existing.channel_title = snippet.get(
                    "channelTitle", existing.channel_title
                )
                existing.thumbnail_url = (
                    snippet.get("thumbnails", {})
                    .get("medium", {})
                    .get("url", "")
                ) or existing.thumbnail_url
                existing.description = snippet.get(
                    "description", existing.description
                )
                existing.published_at = _iso_to_datetime(
                    snippet.get("publishedAt")
                ) or existing.published_at
                existing.video_count = content_details.get(
                    "itemCount", existing.video_count
                )
                existing.save(
                    update_fields=[
                        "title",
                        "channel_title",
                        "thumbnail_url",
                        "description",
                        "published_at",
                        "video_count",
                        "updated_at",
                    ]
                )

                # Update videos for URL playlists too
                reconcile_playlist_videos(existing, item_video_map, video_details)
                imported_count += 1
                continue

            defaults = {
                "title": snippet.get("title", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "thumbnail_url": (
                    snippet.get("thumbnails", {})
                    .get("medium", {})
                    .get("url", "")
                ),
                "description": snippet.get("description", ""),
                "published_at": _iso_to_datetime(snippet.get("publishedAt")),
                "video_count": content_details.get("itemCount", 0),
                "source": "oauth",
            }

            playlist, created = Playlist.objects.update_or_create(
                user=user,
                youtube_playlist_id=pl_id,
                defaults=defaults,
            )

            # Reconcile videos — update/create incoming, mark missing as removed
            reconcile_playlist_videos(playlist, item_video_map, video_details)
            imported_count += 1

    return imported_count


def refresh_oauth_playlist_for_user(user: User, playlist: Playlist) -> Playlist:
    """Refresh a single OAuth-sourced playlist from YouTube.

    Fetches current playlist metadata, items, and video details, then
    reconciles the local video rows.  Returns the updated playlist.
    """
    access_token = get_valid_access_token(user)

    playlist_data_list = _fetch_oauth_playlists_by_ids(
        [playlist.youtube_playlist_id], access_token
    )
    if not playlist_data_list:
        raise YouTubeAPIError(
            "Playlist not found on YouTube. "
            "It may have been deleted or made private."
        )

    playlist_data = playlist_data_list[0]
    item_video_map, video_details = _playlist_video_payloads(
        playlist.youtube_playlist_id, access_token
    )
    return _persist_oauth_playlist(
        user, playlist_data, item_video_map, video_details
    )


def _create_videos(
    playlist: Playlist,
    item_video_map: dict[int, dict],
    video_details: dict[str, dict],
) -> None:
    """Create Video rows for *playlist* from the collected item/video data."""
    for position, item in sorted(item_video_map.items()):
        vid = item["video_id"]
        detail = video_details.get(vid, {})
        detail_snippet = detail.get("snippet", {})
        detail_content = detail.get("contentDetails", {})
        detail_stats = detail.get("statistics", {})

        duration = _parse_iso_duration(
            detail_content.get("duration", "PT0S")
        )

        Video.objects.create(
            playlist=playlist,
            youtube_video_id=vid,
            position=position,
            title=detail_snippet.get("title") or item["title"],
            channel_title=detail_snippet.get("channelTitle")
            or item["channel_title"],
            duration=duration,
            thumbnail_url=(
                detail_snippet.get("thumbnails", {})
                .get("default", {})
                .get("url", "")
            )
            or item["thumbnail_url"],
            published_at=_iso_to_datetime(
                detail_snippet.get("publishedAt")
                or item.get("published_at")
            ),
            view_count=int(detail_stats.get("viewCount", 0)),
        )
