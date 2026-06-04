from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Playlist
from .serializers import (
    LoginSerializer,
    PlaylistDetailSerializer,
    PlaylistSerializer,
    PlaylistUrlImportSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .youtube import PlaylistImportError, YouTubeAPIError, import_playlist_for_user


def auth_response_for_user(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {
        "token": token.key,
        "user": UserSerializer(user).data,
    }


@api_view(["GET"])
def api_root(request):
    return Response({
        "message": "Hello from Django REST Framework!",
        "status": "ok",
    })


@api_view(["POST"])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(
        auth_response_for_user(user),
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(auth_response_for_user(serializer.validated_data["user"]))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    return Response(UserSerializer(request.user).data)


# ── Playlist views ───────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def playlist_list(request):
    """List playlists owned by the current user."""
    playlists = Playlist.objects.filter(user=request.user)
    return Response(PlaylistSerializer(playlists, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def playlist_detail(request, pk):
    """Get a single playlist owned by the current user."""
    try:
        playlist = Playlist.objects.get(pk=pk, user=request.user)
    except Playlist.DoesNotExist:
        return Response(
            {"detail": "Playlist not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(PlaylistDetailSerializer(playlist).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def playlist_import(request):
    """Import a public YouTube playlist from a URL for the current user."""
    serializer = PlaylistUrlImportSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    url = serializer.validated_data["url"]

    try:
        playlist, created = import_playlist_for_user(request.user, url)
    except PlaylistImportError as exc:
        return Response(
            {"url": url, "detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except YouTubeAPIError as exc:
        return Response(
            {"url": url, "detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(
        PlaylistDetailSerializer(playlist).data,
        status=response_status,
    )
