import re
from typing import Tuple
from urllib.parse import parse_qs, urlparse

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Max

from .models import Playlist, Video


class PlaylistImportError(ValueError):
    """Invalid playlist URL or missing parameters."""


class YouTubeAPIError(RuntimeError):
    """YouTube API request failed or returned unexpected data."""


def extract_playlist_id(url: str) -> str:
    """Extract a playlist ID from a YouTube URL.

    Supported formats:
      - https://www.youtube.com/playlist?list=PL...
      - https://youtube.com/watch?v=VIDEO_ID&list=PL...
      - https://youtu.be/VIDEO_ID?list=PL...
      - https://www.youtube.com/playlist?list=PL...&si=...

    Raises PlaylistImportError when no playlist ID can be found.
    """
    if not url or not url.strip():
        raise PlaylistImportError("No URL provided.")

    stripped = url.strip()

    # Basic sanity check — must look like a YouTube URL
    if "youtube.com" not in stripped and "youtu.be" not in stripped:
        raise PlaylistImportError("This does not look like a YouTube URL.")

    parsed = urlparse(stripped)
    query = parse_qs(parsed.query)

    # The `list` query parameter is the playlist ID
    playlist_id = query.get("list", [None])[0]
    if not playlist_id:
        raise PlaylistImportError(
            "No playlist ID found in the URL. Make sure the URL includes "
            "a `list` parameter (e.g. ?list=PL...)."
        )

    # Typically playlist IDs start with PL, RD, UU, FL, LL, OL, TL, PU
    if not re.match(r"^[a-zA-Z0-9_-]{13,}(?:\.\.)?\w*$", playlist_id):
        raise PlaylistImportError(
            f"The playlist ID “{playlist_id}” does not look valid."
        )

    return playlist_id


def _youtube_api_key():
    key = settings.YOUTUBE_API_KEY
    if not key:
        raise PlaylistImportError(
            "YouTube API key is not configured. "
            "Please set the YOUTUBE_API_KEY environment variable."
        )
    return key


def _get(url: str, params: dict) -> dict:
    """Make a GET request to the YouTube Data API v3 and return JSON."""
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code == 403:
        raise YouTubeAPIError(
            "YouTube API quota exceeded or API key is invalid. "
            "Please check your API key configuration."
        )
    if not resp.ok:
        raise YouTubeAPIError(
            f"YouTube API request failed with status {resp.status_code}."
        )

    data = resp.json()
    if "error" in data:
        message = data["error"].get("message", "Unknown YouTube API error.")
        raise YouTubeAPIError(f"YouTube API error: {message}")

    return data


def _fetch_playlist_snippet(playlist_id: str) -> dict:
    key = _youtube_api_key()
    data = _get(
        "https://www.googleapis.com/youtube/v3/playlists",
        {
            "part": "snippet,contentDetails",
            "id": playlist_id,
            "key": key,
        },
    )
    items = data.get("items", [])
    if not items:
        raise YouTubeAPIError(
            "Playlist not found on YouTube. It may have been deleted or made private."
        )
    return items[0]


def _fetch_playlist_items(playlist_id: str) -> list[dict]:
    """Fetch all playlist items (paginated)."""
    key = _youtube_api_key()
    items = []
    page_token = None

    while True:
        params = {
            "part": "snippet,contentDetails",
            "playlistId": playlist_id,
            "maxResults": 50,
            "key": key,
        }
        if page_token:
            params["pageToken"] = page_token

        data = _get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params,
        )
        items.extend(data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def _fetch_video_details(video_ids: list[str]) -> dict[str, dict]:
    """Fetch video details (contentDetails, statistics) in batches of 50."""
    key = _youtube_api_key()
    details: dict[str, dict] = {}

    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        data = _get(
            "https://www.googleapis.com/youtube/v3/videos",
            {
                "part": "contentDetails,statistics,snippet",
                "id": ",".join(batch),
                "key": key,
            },
        )
        for item in data.get("items", []):
            details[item["id"]] = item

    return details


def _parse_iso_duration(duration_str: str) -> str:
    """Convert ISO 8601 duration (e.g. PT1H2M3S) to a display string (1:02:03)."""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
    if not match:
        return duration_str

    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)

    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _iso_to_datetime(iso_str: str | None):
    """Parse an ISO datetime string to a Django-aware datetime; return None on failure."""
    if not iso_str:
        return None
    try:
        from django.utils.dateparse import parse_datetime
        return parse_datetime(iso_str)
    except Exception:
        return None


# ── Personal playlist helpers ──────────────────────────────────────────────


def extract_video_id(url_or_id: str) -> str:
    """Return an 11-character YouTube video ID or raise PlaylistImportError."""
    if not url_or_id or not url_or_id.strip():
        raise PlaylistImportError("No URL provided.")

    stripped = url_or_id.strip()

    # Raw 11-character YouTube video ID
    if re.match(r"^[a-zA-Z0-9_-]{11}$", stripped):
        return stripped

    # Must be a YouTube URL from here on
    if "youtube.com" not in stripped and "youtu.be" not in stripped:
        raise PlaylistImportError("This does not look like a YouTube video URL or ID.")

    parsed = urlparse(stripped)
    query = parse_qs(parsed.query)

    # youtu.be/<id> short URL
    if "youtu.be" in parsed.netloc:
        video_id = parsed.path.strip("/")
        if re.match(r"^[a-zA-Z0-9_-]{11}$", video_id):
            return video_id
        raise PlaylistImportError(
            f"The short URL path \"{video_id}\" does not look like a valid video ID."
        )

    # youtube.com/shorts/<id>
    if "/shorts/" in parsed.path:
        shorts_match = re.search(r"/shorts/([a-zA-Z0-9_-]{11})", parsed.path)
        if shorts_match:
            return shorts_match.group(1)
        raise PlaylistImportError(
            "Could not extract a video ID from the Shorts URL."
        )

    # Standard watch URL with ?v= param
    video_id = query.get("v", [None])[0]
    if video_id and re.match(r"^[a-zA-Z0-9_-]{11}$", video_id):
        return video_id

    # Check if this is a playlist URL with a `list` param — reject for video import
    if query.get("list"):
        raise PlaylistImportError(
            "This looks like a playlist URL. To import a single video, "
            "use a watch URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID) "
            "or paste the 11-character video ID directly."
        )

    if video_id:
        raise PlaylistImportError(
            f"The video ID \"{video_id}\" does not look valid."
        )

    raise PlaylistImportError(
        "Could not find a video ID in the URL. "
        "Use a watch URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID), "
        "a youtu.be short link, or paste the 11-character video ID directly."
    )


def get_or_create_personal_playlist_for_user(user: User) -> Playlist:
    """Return the user's visible personal playlist, creating it if missing."""
    playlist, _ = Playlist.objects.get_or_create(
        user=user,
        youtube_playlist_id=f"personal:{user.id}",
        defaults={
            "title": "My Playlist",
            "channel_title": "",
            "description": "",
            "thumbnail_url": "",
            "video_count": 0,
            "source": Playlist.SOURCE_PERSONAL,
            "is_unlinked": False,
        },
    )

    # If the personal playlist was previously unlinked, restore visibility
    if playlist.is_unlinked:
        playlist.is_unlinked = False
        playlist.save(update_fields=["is_unlinked", "updated_at"])

    return playlist


def import_personal_video_for_user(
    user: User, url_or_id: str
) -> tuple[Playlist, bool]:
    """Import one YouTube video into the user's personal playlist.

    Returns (playlist, created), where created is True only when a new Video row
    was appended to the personal playlist.
    """
    video_id = extract_video_id(url_or_id)

    # Fetch video metadata from YouTube
    try:
        details = _fetch_video_details([video_id])
    except YouTubeAPIError:
        raise
    except Exception as exc:
        raise YouTubeAPIError(
            f"Failed to fetch video details from YouTube: {exc}"
        ) from exc

    item = details.get(video_id)
    if not item:
        raise YouTubeAPIError(
            "Video not found on YouTube. It may have been deleted or made private."
        )

    snippet = item.get("snippet", {})
    content_details = item.get("contentDetails", {})
    stats = item.get("statistics", {})

    duration = _parse_iso_duration(content_details.get("duration", "PT0S"))

    with transaction.atomic():
        playlist = get_or_create_personal_playlist_for_user(user)

        existing_video = Video.objects.filter(
            playlist=playlist, youtube_video_id=video_id
        ).first()

        is_new = existing_video is None

        if is_new:
            # Compute next position
            max_pos = (
                playlist.videos.aggregate(
                    max_pos=Max("position")
                )["max_pos"]
            )
            position = (max_pos + 1) if max_pos is not None else 0

            Video.objects.create(
                playlist=playlist,
                youtube_video_id=video_id,
                position=position,
                title=snippet.get("title", ""),
                channel_title=snippet.get("channelTitle", ""),
                duration=duration,
                thumbnail_url=(
                    snippet.get("thumbnails", {})
                    .get("default", {})
                    .get("url", "")
                ),
                published_at=_iso_to_datetime(snippet.get("publishedAt")),
                view_count=int(stats.get("viewCount", 0)),
                is_removed=False,
            )
        else:
            # Update existing video metadata
            existing_video.title = snippet.get("title") or existing_video.title
            existing_video.channel_title = (
                snippet.get("channelTitle") or existing_video.channel_title
            )
            existing_video.duration = duration
            existing_video.thumbnail_url = (
                snippet.get("thumbnails", {})
                .get("default", {})
                .get("url", "")
            ) or existing_video.thumbnail_url
            existing_video.published_at = _iso_to_datetime(
                snippet.get("publishedAt")
            ) or existing_video.published_at
            existing_video.view_count = int(stats.get("viewCount", 0))
            existing_video.is_removed = False
            existing_video.save()

        # Update playlist thumbnail from first active video if playlist has none
        if not playlist.thumbnail_url:
            first_active = playlist.videos.filter(is_removed=False).order_by(
                "position"
            ).first()
            if first_active and first_active.thumbnail_url:
                playlist.thumbnail_url = first_active.thumbnail_url

        # Keep video_count accurate — count all videos including removed,
        # consistent with how URL playlists use YouTube's itemCount.
        playlist.video_count = playlist.videos.count()
        playlist.save(
            update_fields=["thumbnail_url", "video_count", "updated_at"]
        )

    return playlist, is_new


def reconcile_playlist_videos(
    playlist: Playlist,
    item_video_map: dict[int, dict],
    video_details: dict[str, dict],
) -> None:
    """Create or update videos for *playlist* from the collected item/video data.

    Incoming video IDs are saved or updated with ``is_removed=False``.
    Existing videos whose YouTube IDs are **not** in *item_video_map* are
    marked ``is_removed=True``.  No rows are deleted.
    """
    incoming_ids: set[str] = set()
    for item in item_video_map.values():
        vid = item.get("video_id")
        if vid:
            incoming_ids.add(vid)

    # 1. Upsert incoming videos
    for position, item in sorted(item_video_map.items()):
        vid = item["video_id"]
        detail = video_details.get(vid, {})
        detail_snippet = detail.get("snippet", {})
        detail_content = detail.get("contentDetails", {})
        detail_stats = detail.get("statistics", {})

        duration = _parse_iso_duration(
            detail_content.get("duration", "PT0S")
        )

        defaults = {
            "position": position,
            "title": detail_snippet.get("title") or item["title"],
            "channel_title": detail_snippet.get("channelTitle")
            or item["channel_title"],
            "duration": duration,
            "thumbnail_url": (
                detail_snippet.get("thumbnails", {})
                .get("default", {})
                .get("url", "")
            )
            or item["thumbnail_url"],
            "published_at": _iso_to_datetime(
                detail_snippet.get("publishedAt")
                or item.get("published_at")
            ),
            "view_count": int(detail_stats.get("viewCount", 0)),
            "is_removed": False,
        }

        Video.objects.update_or_create(
            playlist=playlist,
            youtube_video_id=vid,
            defaults=defaults,
        )

    # 2. Mark stale videos (not in incoming set) as removed
    playlist.videos.exclude(
        youtube_video_id__in=list(incoming_ids) if incoming_ids else ["__sentinel__"]
    ).update(is_removed=True)


def import_playlist_for_user(user: User, url: str) -> Tuple[Playlist, bool]:
    """Import or re-import a public YouTube playlist for the given user.

    Returns (playlist, created) where *created* is True for a new playlist
    and False when an existing playlist was updated.
    """
    playlist_id = extract_playlist_id(url)

    # Fetch from YouTube API
    try:
        snippet_data = _fetch_playlist_snippet(playlist_id)
        items_data = _fetch_playlist_items(playlist_id)
    except (PlaylistImportError, YouTubeAPIError):
        raise
    except Exception as exc:
        raise YouTubeAPIError(
            f"Failed to fetch playlist data from YouTube: {exc}"
        ) from exc

    snippet = snippet_data.get("snippet", {})
    content_details = snippet_data.get("contentDetails", {})

    # Collect video item details
    item_video_map: dict[int, dict] = {}  # position -> item dict
    video_ids = []
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

    # Batch-fetch video details for durations and view counts
    try:
        video_details = _fetch_video_details(video_ids) if video_ids else {}
    except YouTubeAPIError:
        raise
    except Exception as exc:
        raise YouTubeAPIError(
            f"Failed to fetch video details from YouTube: {exc}"
        ) from exc

    with transaction.atomic():
        playlist, created = Playlist.objects.update_or_create(
            user=user,
            youtube_playlist_id=playlist_id,
            defaults={
                "title": snippet.get("title", ""),
                "channel_title": snippet.get("channelTitle", ""),
                "thumbnail_url": (
                    snippet.get("thumbnails", {})
                    .get("medium", {})
                    .get("url", "")
                ),
                "description": snippet.get("description", ""),
                "published_at": _iso_to_datetime(
                    snippet.get("publishedAt")
                ),
                "video_count": content_details.get("itemCount", 0),
                "source": "url",
                "is_unlinked": False,
            },
        )

        # Reconcile videos — update/create incoming, mark missing as removed
        reconcile_playlist_videos(playlist, item_video_map, video_details)

    return playlist, created
