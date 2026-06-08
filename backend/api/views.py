from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Note, Playlist
from .serializers import (
    LoginSerializer,
    NoteSerializer,
    PlaylistDetailSerializer,
    PlaylistSerializer,
    PlaylistUrlImportSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .youtube import PlaylistImportError, YouTubeAPIError, import_playlist_for_user
from .youtube_oauth import (
    YouTubeOAuthConfigError,
    YouTubeOAuthError,
    build_authorization_url,
    validate_oauth_state,
    exchange_code_for_tokens,
    store_oauth_tokens_for_user,
    fetch_oauth_channel_profile,
    import_selected_oauth_playlists_for_user,
    list_remote_playlists_for_user,
    get_valid_access_token,
)
from .models import YouTubeOAuthToken


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


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def note_detail(request, video_id):
    """Get or upsert the current user's note for a YouTube video ID."""
    if not video_id.strip():
        return Response(
            {"detail": "Video ID is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "GET":
        note = Note.objects.filter(
            user=request.user,
            youtube_video_id=video_id,
        ).first()
        if note is None:
            return Response({
                "id": None,
                "youtube_video_id": video_id,
                "content": "",
                "created_at": None,
                "updated_at": None,
            })
        return Response(NoteSerializer(note).data)

    serializer = NoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    note, _ = Note.objects.update_or_create(
        user=request.user,
        youtube_video_id=video_id,
        defaults={"content": serializer.validated_data["content"]},
    )
    return Response(NoteSerializer(note).data)


# ── YouTube OAuth views ──────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def youtube_status(request):
    """Return the current user's YouTube OAuth connection status."""
    try:
        row = YouTubeOAuthToken.objects.get(user=request.user)
        return Response({
            "connected": True,
            "channel_id": row.youtube_channel_id or None,
            "channel_title": row.youtube_channel_title or None,
        })
    except YouTubeOAuthToken.DoesNotExist:
        return Response({
            "connected": False,
            "channel_id": None,
            "channel_title": None,
        })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def youtube_auth_url(request):
    """Return a Google OAuth authorization URL with signed state."""
    try:
        result = build_authorization_url(request.user.id)
    except YouTubeOAuthConfigError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def youtube_callback(request):
    """Complete the OAuth flow and store the connected account tokens."""
    code = request.data.get("code", "")
    state_str = request.data.get("state", "")

    if not code:
        return Response(
            {"detail": "Missing authorization code."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not state_str:
        return Response(
            {"detail": "Missing OAuth state parameter."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 1. Validate state
    try:
        validate_oauth_state(state_str, request.user.id)
    except YouTubeOAuthError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 2. Exchange code for tokens
    try:
        token_payload = exchange_code_for_tokens(code)
    except YouTubeOAuthConfigError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except YouTubeOAuthError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # 3. Store tokens
    try:
        token_row = store_oauth_tokens_for_user(request.user, token_payload)
    except (YouTubeOAuthConfigError, YouTubeOAuthError, YouTubeAPIError) as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # 4. Fetch channel profile
    try:
        access_token = get_valid_access_token(request.user)
        profile = fetch_oauth_channel_profile(access_token)
    except (YouTubeOAuthConfigError, YouTubeOAuthError) as exc:
        # Token is stored — don't fail the whole callback for profile.
        profile = {"channel_id": "", "channel_title": ""}
    else:
        token_row.youtube_channel_id = profile.get("channel_id", "")
        token_row.youtube_channel_title = profile.get("channel_title", "")
        token_row.save(update_fields=["youtube_channel_id", "youtube_channel_title"])

    return Response({
        "connected": True,
        "imported_playlist_count": 0,
        "channel_id": token_row.youtube_channel_id or None,
        "channel_title": token_row.youtube_channel_title or None,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def youtube_remote_playlists(request):
    """List remote YouTube playlists for the connected current user."""
    try:
        playlists = list_remote_playlists_for_user(request.user)
    except YouTubeOAuthError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except YouTubeAPIError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(playlists)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def youtube_import_playlists(request):
    """Save the selected remote YouTube playlists for the current user."""
    if "playlist_ids" not in request.data:
        return Response(
            {"detail": "playlist_ids is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    playlist_ids = request.data.get("playlist_ids")
    if not isinstance(playlist_ids, list):
        return Response(
            {"detail": "playlist_ids must be a list."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not all(isinstance(playlist_id, str) for playlist_id in playlist_ids):
        return Response(
            {"detail": "playlist_ids must contain only strings."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        playlists, imported_count = import_selected_oauth_playlists_for_user(
            request.user,
            playlist_ids,
        )
    except YouTubeOAuthError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except YouTubeAPIError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        "imported_playlist_count": imported_count,
        "playlists": PlaylistSerializer(playlists, many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def youtube_disconnect(request):
    """Disconnect the current user's YouTube OAuth account.

    Deletes the user's OAuth token row and removes only playlists with
    ``source="oauth"``.  URL-linked playlists and notes are preserved.
    """
    try:
        token_row = YouTubeOAuthToken.objects.get(user=request.user)
    except YouTubeOAuthToken.DoesNotExist:
        return Response({
            "connected": False,
            "removed_playlist_count": 0,
        })

    # Count and delete only OAuth-sourced playlists (cascade deletes videos)
    oauth_playlists = request.user.playlists.filter(source="oauth")
    removed_count = oauth_playlists.count()
    oauth_playlists.delete()

    token_row.delete()

    return Response({
        "connected": False,
        "removed_playlist_count": removed_count,
    })
