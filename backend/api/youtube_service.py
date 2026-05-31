import re
from typing import Any

import requests
from django.conf import settings

GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
]
# Maximum video IDs per batch request (YouTube API limit: 50)
MAX_VIDEO_IDS_PER_BATCH = 50


def fetch_playlists(access_token: str) -> list[dict[str, Any]]:
    """Fetch the authenticated user's playlists.

    GET https://www.googleapis.com/youtube/v3/playlists?mine=true&part=snippet,contentDetails
    """
    url = f"{YOUTUBE_API_BASE}/playlists"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "mine": "true",
        "part": "snippet,contentDetails",
        "maxResults": 50,
    }

    items: list[dict[str, Any]] = []
    page_token: str | None = None

    while True:
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def fetch_playlist_items(api_key: str, playlist_id: str) -> list[dict[str, Any]]:
    """Fetch all items in a public playlist using an API key.

    GET https://www.googleapis.com/youtube/v3/playlistItems
    Paginates through all pages.
    """
    url = f"{YOUTUBE_API_BASE}/playlistItems"
    params: dict[str, Any] = {
        "part": "snippet,contentDetails",
        "playlistId": playlist_id,
        "key": api_key,
        "maxResults": 50,
    }

    items: list[dict[str, Any]] = []
    page_token: str | None = None

    while True:
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def fetch_playlist_items_with_token(
    access_token: str, playlist_id: str
) -> list[dict[str, Any]]:
    """Fetch all items in a playlist using an OAuth access token.

    GET https://www.googleapis.com/youtube/v3/playlistItems
    Paginates through all pages.
    """
    url = f"{YOUTUBE_API_BASE}/playlistItems"
    headers = {"Authorization": f"Bearer {access_token}"}
    params: dict[str, Any] = {
        "part": "snippet,contentDetails",
        "playlistId": playlist_id,
        "maxResults": 50,
    }

    items: list[dict[str, Any]] = []
    page_token: str | None = None

    while True:
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(url, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def fetch_video_details(
    api_key: str, video_ids: list[str]
) -> list[dict[str, Any]]:
    """Fetch video details (duration, statistics) for up to 50 video IDs at a time.

    GET https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics
    Makes multiple requests if more than 50 IDs are provided.
    """
    url = f"{YOUTUBE_API_BASE}/videos"

    all_items: list[dict[str, Any]] = []
    for i in range(0, len(video_ids), MAX_VIDEO_IDS_PER_BATCH):
        batch = video_ids[i : i + MAX_VIDEO_IDS_PER_BATCH]
        params: dict[str, Any] = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(batch),
            "key": api_key,
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        all_items.extend(data.get("items", []))

    return all_items


def exchange_oauth_code(code: str, redirect_uri: str) -> dict[str, Any]:
    """Exchange an OAuth authorization code for access and refresh tokens.

    POST https://oauth2.googleapis.com/token
    Returns dict with 'access_token', 'refresh_token', 'expires_in', 'token_type'.
    """
    payload = {
        "code": code,
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    resp = requests.post(GOOGLE_OAUTH_TOKEN_URL, data=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Refresh an expired access token using a refresh token.

    POST https://oauth2.googleapis.com/token
    Returns dict with 'access_token', 'expires_in', 'token_type'.
    """
    payload = {
        "refresh_token": refresh_token,
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
        "grant_type": "refresh_token",
    }
    resp = requests.post(GOOGLE_OAUTH_TOKEN_URL, data=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def format_duration(iso_duration: str) -> str:
    """Convert ISO 8601 duration (e.g. PT1H2M3S) to human-readable string (e.g. 1:02:03).

    Handles PT#H#M#S, PT#M#S, PT#S, and P#DT#H#M#S formats.
    Returns '0:00' for empty or unparseable input.
    """
    if not iso_duration:
        return "0:00"

    pattern = r"^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$"
    match = re.match(pattern, iso_duration)

    if not match:
        return "0:00"

    days = int(match.group(1)) if match.group(1) else 0
    hours = int(match.group(2)) if match.group(2) else 0
    minutes = int(match.group(3)) if match.group(3) else 0
    seconds = int(match.group(4)) if match.group(4) else 0

    total_seconds = seconds + 60 * minutes + 3600 * hours + 86400 * days

    if total_seconds < 0:
        return "0:00"

    h = total_seconds // 3600
    m = (total_seconds % 3600) // 60
    s = total_seconds % 60

    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    else:
        return f"{m}:{s:02d}"
