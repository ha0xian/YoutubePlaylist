from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_root, name="api-root"),
    path("auth/register/", views.register, name="auth-register"),
    path("auth/login/", views.login, name="auth-login"),
    path("auth/me/", views.current_user, name="auth-me"),
    path("playlists/", views.playlist_list, name="playlist-list"),
    path("playlists/<int:pk>/", views.playlist_detail, name="playlist-detail"),
    path("playlists/import/", views.playlist_import, name="playlist-import"),
    path("notes/<str:video_id>/", views.note_detail, name="note-detail"),
    path("youtube/status/", views.youtube_status, name="youtube-status"),
    path("youtube/auth-url/", views.youtube_auth_url, name="youtube-auth-url"),
    path("youtube/callback/", views.youtube_callback, name="youtube-callback"),
    path("youtube/disconnect/", views.youtube_disconnect, name="youtube-disconnect"),
]
