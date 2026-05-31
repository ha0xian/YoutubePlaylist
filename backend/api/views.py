import logging
import requests
from urllib.parse import urlencode
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from . import youtube_service
from .encryption import encrypt_token
from .models import Playlist, Video, VideoNote, YouTubeOAuthToken
from .serializers import LinkPlaylistByUrlSerializer, PlaylistSerializer, PlaylistSummarySerializer, VideoNoteSerializer

logger = logging.getLogger(__name__)

@api_view(["GET"])
def api_root(request):
    return Response({"message": "Hello from Django REST Framework!", "status": "ok"})

class OAuthInitiateView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response({"auth_url": "https://accounts.google.com/o/oauth2/auth?" + urlencode({
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(youtube_service.YOUTUBE_SCOPES),
            "access_type": "offline",
        })})

class OAuthCallbackView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        code = request.data.get("code", "")
        if not code:
            return Response({"detail": "Authorization code is required."}, status=400)
        try:
            td = youtube_service.exchange_oauth_code(code, settings.GOOGLE_OAUTH_REDIRECT_URI)
        except requests.RequestException:
            return Response({"detail": "Invalid authorization code."}, status=400)
        at = td["access_token"]
        YouTubeOAuthToken.objects.update_or_create(user=request.user, defaults={
            "access_token": encrypt_token(at),
            "refresh_token": encrypt_token(td.get("refresh_token", "")) if td.get("refresh_token") else b"",
            "token_type": td.get("token_type", "Bearer"),
            "expires_at": timezone.now() + timezone.timedelta(seconds=td.get("expires_in", 3600)),
        })
        try:
            items = youtube_service.fetch_playlists(at)
        except requests.RequestException:
            return Response({"detail": "Failed to fetch YouTube playlists."}, status=502)
        created = []
        for item in items:
            s = item.get("snippet", {})
            p, _ = Playlist.objects.update_or_create(user=request.user, youtube_playlist_id=item["id"], defaults={
                "title": s.get("title", ""), "channel_title": s.get("channelTitle", ""),
                "thumbnail_url": s.get("thumbnails", {}).get("default", {}).get("url", ""),
                "description": s.get("description", ""), "video_count": item.get("contentDetails", {}).get("itemCount", 0),
                "published_at": s.get("publishedAt"), "source_type": "oauth", "is_hidden": False, "is_unlinked": False,
            })
            created.append(p)
        return Response({"playlists": PlaylistSummarySerializer(created, many=True).data, "count": len(created)}, status=201)

class DisconnectYouTubeView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        YouTubeOAuthToken.objects.filter(user=request.user).delete()
        Playlist.objects.filter(user=request.user, source_type="oauth").update(is_unlinked=True)
        return Response({"detail": "YouTube account disconnected."})

class PlaylistListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        qs = Playlist.objects.filter(user=request.user, is_hidden=False, is_unlinked=False)
        return Response(PlaylistSummarySerializer(qs, many=True).data)

class HiddenPlaylistListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        qs = Playlist.objects.filter(user=request.user, is_hidden=True, is_unlinked=False)
        return Response(PlaylistSummarySerializer(qs, many=True).data)

class PlaylistDetailView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, pk):
        return Response(PlaylistSerializer(get_object_or_404(Playlist, pk=pk, user=request.user)).data)

class LinkPlaylistByUrlView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        if not settings.YOUTUBE_API_KEY:
            return Response({"detail": "YouTube API key not configured."}, status=503)
        ser = LinkPlaylistByUrlSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        url = ser.validated_data["url"]
        pid = ser.validated_data["playlist_id"]
        try:
            items = youtube_service.fetch_playlist_items(settings.YOUTUBE_API_KEY, pid)
        except requests.RequestException:
            return Response({"url": url, "detail": "Invalid or non-existent YouTube playlist URL."}, status=400)
        if not items:
            return Response({"url": url, "detail": "Invalid or non-existent YouTube playlist URL."}, status=400)
        vids = [item["snippet"]["resourceId"]["videoId"] for item in items if "videoId" in item.get("snippet", {}).get("resourceId", {})]
        dmap = {}
        if vids:
            dmap = {d["id"]: d for d in youtube_service.fetch_video_details(settings.YOUTUBE_API_KEY, vids)}
        s0 = items[0]["snippet"]
        pl, _ = Playlist.objects.update_or_create(user=request.user, youtube_playlist_id=pid, defaults={
            "title": s0.get("title", ""), "channel_title": s0.get("channelTitle", ""),
            "thumbnail_url": s0.get("thumbnails", {}).get("default", {}).get("url", ""),
            "description": s0.get("description", ""), "video_count": len(vids),
            "published_at": s0.get("publishedAt"), "source_type": "url", "is_hidden": False, "is_unlinked": False,
        })
        for idx, item in enumerate(items):
            vid = item.get("snippet", {}).get("resourceId", {}).get("videoId")
            if not vid:
                continue
            d = dmap.get(vid, {})
            snippet = item.get("snippet", {})
            Video.objects.update_or_create(playlist=pl, youtube_video_id=vid, defaults={
                "title": snippet.get("title", ""),
                "channel_title": snippet.get("channelTitle", d.get("snippet", {}).get("channelTitle", "")),
                "duration": d.get("contentDetails", {}).get("duration", ""),
                "thumbnail_url": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                "published_at": snippet.get("publishedAt"),
                "view_count": int(d.get("statistics", {}).get("viewCount", 0)),
                "position": idx,
            })
        pl.refresh_from_db()
        return Response(PlaylistSerializer(pl).data, status=201)

class HidePlaylistView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        p = get_object_or_404(Playlist, pk=pk, user=request.user)
        p.is_hidden = True
        p.save(update_fields=["is_hidden"])
        return Response({"detail": "Playlist hidden."})

class UnhidePlaylistView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        p = get_object_or_404(Playlist, pk=pk, user=request.user)
        p.is_hidden = False
        p.save(update_fields=["is_hidden"])
        return Response(PlaylistSummarySerializer(p).data)

class UnlinkPlaylistView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        p = get_object_or_404(Playlist, pk=pk, user=request.user)
        p.is_unlinked = True
        p.save(update_fields=["is_unlinked"])
        return Response({"detail": "Playlist unlinked."})

class VideoNoteView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, video_id):
        if not Video.objects.filter(pk=video_id, playlist__user=request.user).exists():
            return Response({"detail": "Video not found."}, status=404)
        note = VideoNote.objects.filter(user=request.user, video_id=video_id).first()
        if note is None:
            return Response({"video_id": video_id, "body_markdown": "", "updated_at": None})
        return Response(VideoNoteSerializer(note).data)
    def put(self, request, video_id):
        v = get_object_or_404(Video, pk=video_id, playlist__user=request.user)
        note, _ = VideoNote.objects.update_or_create(user=request.user, video=v, defaults={"body_markdown": request.data.get("body_markdown", "")})
        return Response(VideoNoteSerializer(note).data)
