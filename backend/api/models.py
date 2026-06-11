from django.contrib.auth.models import User
from django.db import models


class Playlist(models.Model):
    SOURCE_URL = "url"
    SOURCE_OAUTH = "oauth"
    SOURCE_PERSONAL = "personal"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="playlists")
    youtube_playlist_id = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=500)
    channel_title = models.CharField(max_length=255)
    thumbnail_url = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    video_count = models.PositiveIntegerField(default=0)
    source = models.CharField(max_length=20, default="url")
    is_unlinked = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "youtube_playlist_id"],
                name="unique_user_playlist",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Video(models.Model):
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE, related_name="videos"
    )
    youtube_video_id = models.CharField(max_length=20)
    position = models.PositiveIntegerField()
    title = models.CharField(max_length=500)
    channel_title = models.CharField(max_length=255)
    duration = models.CharField(max_length=20)
    thumbnail_url = models.URLField(max_length=500, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    view_count = models.PositiveBigIntegerField(default=0)
    is_removed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["playlist", "youtube_video_id"],
                name="unique_playlist_video",
            )
        ]
        ordering = ["playlist", "position"]

    def __str__(self):
        return f"{self.position}: {self.title}"


class YouTubeOAuthToken(models.Model):
    """Encrypted YouTube OAuth credential for a single app user."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="youtube_oauth_token",
    )
    encrypted_access_token = models.TextField()
    encrypted_refresh_token = models.TextField(blank=True)
    token_type = models.CharField(max_length=50, default="Bearer")
    expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.TextField(blank=True)
    youtube_channel_id = models.CharField(max_length=100, blank=True)
    youtube_channel_title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"YouTubeOAuthToken(user={self.user_id})"

    class Meta:
        verbose_name = "YouTube OAuth token"


class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")
    youtube_video_id = models.CharField(max_length=20, db_index=True)
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "youtube_video_id"],
                name="unique_user_video_note",
            )
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user_id}: {self.youtube_video_id}"
