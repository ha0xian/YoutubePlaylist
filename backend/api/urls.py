from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_root, name="api-root"),
    # YouTube OAuth
    path(
        "youtube/auth-url/",
        views.OAuthInitiateView.as_view(),
        name="youtube-auth-url",
    ),
    path(
        "youtube/callback/",
        views.OAuthCallbackView.as_view(),
        name="youtube-callback",
    ),
    path(
        "youtube/disconnect/",
        views.DisconnectYouTubeView.as_view(),
        name="youtube-disconnect",
    ),
    # Playlist CRUD
    path("playlists/", views.PlaylistListView.as_view(), name="playlist-list"),
    path(
        "playlists/hidden/",
        views.HiddenPlaylistListView.as_view(),
        name="playlist-hidden-list",
    ),
    path(
        "playlists/link/",
        views.LinkPlaylistByUrlView.as_view(),
        name="playlist-link",
    ),
    path(
        "playlists/<int:pk>/",
        views.PlaylistDetailView.as_view(),
        name="playlist-detail",
    ),
    path(
        "playlists/<int:pk>/hide/",
        views.HidePlaylistView.as_view(),
        name="playlist-hide",
    ),
    path(
        "playlists/<int:pk>/unlink/",
        views.UnlinkPlaylistView.as_view(),
        name="playlist-unlink",
    ),
    # Video notes
    path("notes/<int:video_id>/", views.VideoNoteView.as_view(), name="video-note"),
]
