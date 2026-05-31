import logging
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import youtube_service
from .encryption import encrypt_token
from .models import Playlist, Video, VideoNote, YouTubeOAuthToken
from .serializers import (
    LinkPlaylistByUrlSerializer,
    PlaylistSerializer,
    PlaylistSummarySerializer,
    VideoNoteSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------


@api_view(["GET"])
def api_root(request):
    return Response({
        "message": "Hello from Django REST Framework!",
        "status": "ok",
    })


# ---------------------------------------------------------------------------
# YouTube OAuth
# ---------------------------------------------------------------------------


class OAuthInitiateView(APIView):
    """GET /api/youtube/auth-url/ -- return Google OAuth URL for the frontend."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(youtube_service.YOUTUBE_SCOPES),
            "access_type": "offline",
        }
        auth_url = "https://accounts.google.com/o/oauth2/auth?" + urlencode(params)
        return Response({"auth_url": auth_url})


class OAuthCallbackView(APIView):
    """POST /api/youtube/callback/ -- exchange auth code for tokens and fetch playlists."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get("code", "")
        if not code:
            return Response(
                {"detail": "Authorization code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange the authorization code (server-side redirect_uri only --
        # never accept it from the client, per security finding #1).
        try:
            token_data = youtube_service.exchange_oauth_code(
                code, settings.GOOGLE_OAUTH_REDIRECT_URI
            )
        except requests.RequestException:
            return Response(
                {"detail": "Invalid authorization code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token", "")
        expires_in = token_data.get("expires_in", 3600)

        # Encrypt and store tokens
        YouTubeOAuthToken.objects.update_or_create(
            user=request.user,
            defaults={
                "access_token": encrypt_token(access_token),
                "refresh_token": encrypt_token(refresh_token) if refresh_token else b"",
                "token_type": token_data.get("token_type", "Bearer"),
                "expires_at": timezone.now() + timezone.timedelta(seconds=expires_in),
            },
        )

        # Fetch the user's playlists via OAuth
        try:
            playlist_items = youtube_service.fetch_playlists(access_token)
        except requests.RequestException:
            return Response(
                {"detail": "Failed to fetch YouTube playlists."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        created_playlists: list[Playlist] = []
        for item in playlist_items:
            playlist_id = item["id"]
            snippet = item.get("snippet", {})
            content_details = item.get("contentDetails", {})

            playlist, _ = Playlist.objects.update_or_create(
                user=request.user,
                youtube_playlist_id=playlist_id,
                defaults={
                    "title": snippet.get("title", ""),
                    "channel_title": snippet.get("channelTitle", ""),
                    "thumbnail_url": (
                        snippet.get("thumbnails", {})
                        .get("default", {})
                        .get("url", "")
                    ),
                    "description": snippet.get("description", ""),
                    "video_count": content_details.get("itemCount", 0),
                    "published_at": snippet.get("publishedAt"),
                    "source_type": "oauth",
                    "is_deleted": False,
                    "is_hidden": False,
                    "is_unlinked": False,
                },
            )
            created_playlists.append(playlist)

        serializer = PlaylistSummarySerializer(created_playlists, many=True)
        return Response(
            {"playlists": serializer.data, "count": len(created_playlists)},
            status=status.HTTP_201_CREATED,
        )


class DisconnectYouTubeView(APIView):
    """POST /api/youtube/disconnect/ -- remove OAuth token and mark OAuth playlists unlinked."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Idempotent: delete token if one exists
        YouTubeOAuthToken.objects.filter(user=request.user).delete()

        # Mark OAuth-sourced playlists as unlinked; URL-sourced playlists are preserved.
        Playlist.objects.filter(
            user=request.user, source_type="oauth"
        ).update(is_unlinked=True)

        return Response({"detail": "YouTube account disconnected."})


class YouTubeStatusView(APIView):
    """GET /api/youtube/status/ -- return whether the user has a linked YouTube account."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_token = YouTubeOAuthToken.objects.filter(user=request.user).exists()
        return Response({"connected": has_token})


# ---------------------------------------------------------------------------
# Playlist CRUD
# ---------------------------------------------------------------------------


class PlaylistListView(APIView):
    """GET /api/playlists/ -- list visible, linked playlists for the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        playlists = Playlist.objects.filter(
            user=request.user,
            is_deleted=False,
            is_hidden=False,
            is_unlinked=False,
        )
        serializer = PlaylistSummarySerializer(playlists, many=True)
        return Response(serializer.data)


class HiddenPlaylistListView(APIView):
    """GET /api/playlists/hidden/ -- list hidden playlists for the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        playlists = Playlist.objects.filter(
            user=request.user,
            is_deleted=False,
            is_hidden=True,
            is_unlinked=False,
        )
        serializer = PlaylistSummarySerializer(playlists, many=True)
        return Response(serializer.data)


class PlaylistDetailView(APIView):
    """GET /api/playlists/<id>/ -- return a single playlist with nested videos."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        playlist = get_object_or_404(
            Playlist,
            pk=pk,
            user=request.user,
            is_deleted=False,
        )
        serializer = PlaylistSerializer(playlist)
        return Response(serializer.data)


class LinkPlaylistByUrlView(APIView):
    """POST /api/playlists/link/ -- import a public YouTube playlist by URL."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.YOUTUBE_API_KEY:
            return Response(
                {"detail": "YouTube API key not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = LinkPlaylistByUrlSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        url = serializer.validated_data["url"]
        playlist_id = serializer.validated_data["playlist_id"]

        # Fetch playlist items from YouTube
        try:
            playlist_items = youtube_service.fetch_playlist_items(
                settings.YOUTUBE_API_KEY, playlist_id
            )
        except requests.RequestException:
            return Response(
                {"url": url, "detail": "Invalid or non-existent YouTube playlist URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not playlist_items:
            return Response(
                {"url": url, "detail": "Invalid or non-existent YouTube playlist URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extract video IDs and fetch full details
        video_ids: list[str] = []
        for item in playlist_items:
            resource_id = item.get("snippet", {}).get("resourceId", {})
            vid = resource_id.get("videoId")
            if vid:
                video_ids.append(vid)

        video_details = youtube_service.fetch_video_details(
            settings.YOUTUBE_API_KEY, video_ids
        )
        video_details_map = {item["id"]: item for item in video_details}

        # Use the first item's snippet for playlist-level metadata
        first_snippet = playlist_items[0]["snippet"]

        playlist, _ = Playlist.objects.update_or_create(
            user=request.user,
            youtube_playlist_id=playlist_id,
            defaults={
                "title": first_snippet.get("title", ""),
                "channel_title": first_snippet.get("channelTitle", ""),
                "thumbnail_url": (
                    first_snippet.get("thumbnails", {})
                    .get("default", {})
                    .get("url", "")
                ),
                "description": first_snippet.get("description", ""),
                "video_count": len(video_ids),
                "published_at": first_snippet.get("publishedAt"),
                "source_type": "url",
                "is_deleted": False,
                "is_hidden": False,
                "is_unlinked": False,
            },
        )

        # Create / update video records
        for idx, item in enumerate(playlist_items):
            snippet = item.get("snippet", {})
            resource_id = snippet.get("resourceId", {})
            video_id = resource_id.get("videoId")
            if not video_id:
                continue

            details = video_details_map.get(video_id, {})
            content_details = details.get("contentDetails", {})
            statistics = details.get("statistics", {})
            detail_snippet = details.get("snippet", {})

            Video.objects.update_or_create(
                playlist=playlist,
                youtube_video_id=video_id,
                defaults={
                    "title": snippet.get("title", ""),
                    "channel_title": snippet.get(
                        "channelTitle", detail_snippet.get("channelTitle", "")
                    ),
                    "duration": content_details.get("duration", ""),
                    "thumbnail_url": (
                        snippet.get("thumbnails", {})
                        .get("default", {})
                        .get("url", "")
                    ),
                    "published_at": snippet.get("publishedAt"),
                    "view_count": int(statistics.get("viewCount", 0)),
                    "position": idx,
                    "is_deleted": False,
                },
            )

        # Reload to include related videos
        playlist.refresh_from_db()
        result_serializer = PlaylistSerializer(playlist)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)


class HidePlaylistView(APIView):
    """POST /api/playlists/<id>/hide/ -- hide a playlist."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        playlist = get_object_or_404(
            Playlist,
            pk=pk,
            user=request.user,
            is_deleted=False,
        )
        playlist.is_hidden = True
        playlist.save(update_fields=["is_hidden"])
        return Response({"detail": "Playlist hidden."})


class UnlinkPlaylistView(APIView):
    """POST /api/playlists/<id>/unlink/ -- unlink a playlist (data stays in DB)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        playlist = get_object_or_404(
            Playlist,
            pk=pk,
            user=request.user,
            is_deleted=False,
        )
        playlist.is_unlinked = True
        playlist.save(update_fields=["is_unlinked"])
        return Response({"detail": "Playlist unlinked."})


class ShowPlaylistView(APIView):
    """POST /api/playlists/<id>/show/ -- unhide/restore a hidden playlist."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        playlist = get_object_or_404(
            Playlist,
            pk=pk,
            user=request.user,
            is_deleted=False,
        )
        playlist.is_hidden = False
        playlist.save(update_fields=["is_hidden"])
        return Response({"detail": "Playlist restored."})


# ---------------------------------------------------------------------------
# Video Notes
# ---------------------------------------------------------------------------


class VideoNoteView(APIView):
    """GET /api/notes/<video_id>/ -- return the current user's note for a video.

    PUT /api/notes/<video_id>/ -- save the current user's note for a video.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, video_id):
        # Verify the video exists and belongs to the user
        if not Video.objects.filter(
            pk=video_id, playlist__user=request.user
        ).exists():
            return Response(
                {"detail": "Video not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        note = VideoNote.objects.filter(
            user=request.user, video_id=video_id
        ).first()
        if note is None:
            return Response({
                "video_id": video_id,
                "body_markdown": "",
                "updated_at": None,
            })
        serializer = VideoNoteSerializer(note)
        return Response(serializer.data)

    def put(self, request, video_id):
        video = get_object_or_404(
            Video,
            pk=video_id,
            playlist__user=request.user,
        )

        note, _ = VideoNote.objects.update_or_create(
            user=request.user,
            video=video,
            defaults={
                "body_markdown": request.data.get("body_markdown", ""),
            },
        )
        serializer = VideoNoteSerializer(note)
        return Response(serializer.data)
