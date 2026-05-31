from django.urls import path
from . import views
urlpatterns = [
    path("", views.api_root),
    path("youtube/auth-url/", views.OAuthInitiateView.as_view()),
    path("youtube/callback/", views.OAuthCallbackView.as_view()),
    path("youtube/disconnect/", views.DisconnectYouTubeView.as_view()),
    path("playlists/", views.PlaylistListView.as_view()),
    path("playlists/hidden/", views.HiddenPlaylistListView.as_view()),
    path("playlists/link/", views.LinkPlaylistByUrlView.as_view()),
    path("playlists/<int:pk>/", views.PlaylistDetailView.as_view()),
    path("playlists/<int:pk>/hide/", views.HidePlaylistView.as_view()),
    path("playlists/<int:pk>/unhide/", views.UnhidePlaylistView.as_view()),
    path("playlists/<int:pk>/unlink/", views.UnlinkPlaylistView.as_view()),
    path("notes/<int:video_id>/", views.VideoNoteView.as_view()),
]
