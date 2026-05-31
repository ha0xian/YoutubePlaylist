from django.conf import settings
from django.db import models


class SourceType(models.TextChoices):
    OAUTH = 'oauth', 'OAuth'
    URL = 'url', 'URL'


class YouTubeOAuthToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='youtube_token',
    )
    access_token = models.BinaryField(editable=False)
    refresh_token = models.BinaryField(null=True, blank=True, editable=False)
    token_type = models.CharField(max_length=50, default='Bearer')
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"YouTube token for {self.user.username}"


class Playlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='playlists',
    )
    youtube_playlist_id = models.CharField(max_length=255)
    title = models.CharField(max_length=500)
    channel_title = models.CharField(max_length=500)
    thumbnail_url = models.URLField(max_length=1000)
    description = models.TextField(blank=True, default='')
    video_count = models.IntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    source_type = models.CharField(
        max_length=10,
        choices=SourceType.choices,
    )
    is_hidden = models.BooleanField(default=False)
    is_unlinked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'youtube_playlist_id')

    def __str__(self):
        return self.title


class VideoNote(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_notes',
    )
    video = models.ForeignKey(
        'Video',
        on_delete=models.CASCADE,
        related_name='notes',
    )
    body_markdown = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'video')
        verbose_name = 'Video Note'
        verbose_name_plural = 'Video Notes'

    def __str__(self):
        return f"Note for video {self.video_id} by {self.user.username}"


class Video(models.Model):
    playlist = models.ForeignKey(
        Playlist,
        on_delete=models.CASCADE,
        related_name='videos',
    )
    youtube_video_id = models.CharField(max_length=255)
    title = models.CharField(max_length=500)
    channel_title = models.CharField(max_length=500)
    duration = models.CharField(max_length=50)
    thumbnail_url = models.URLField(max_length=1000)
    published_at = models.DateTimeField(null=True, blank=True)
    view_count = models.BigIntegerField(default=0)
    position = models.IntegerField(default=0)
    is_removed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('playlist', 'youtube_video_id')
        ordering = ['position']

    def __str__(self):
        return self.title
