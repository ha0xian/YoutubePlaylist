from django.contrib.auth.models import User
from django.db import models


class Playlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="playlists")
    youtube_playlist_id = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=500)
    channel_title = models.CharField(max_length=255)
    thumbnail_url = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    video_count = models.PositiveIntegerField(default=0)
    source = models.CharField(max_length=20, default="url")
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
