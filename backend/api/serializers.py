from urllib.parse import parse_qs, urlparse

from rest_framework import serializers

from .models import Playlist, Video, VideoNote


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = [
            "id",
            "youtube_video_id",
            "title",
            "channel_title",
            "duration",
            "thumbnail_url",
            "published_at",
            "view_count",
            "position",
            "is_deleted",
        ]


class PlaylistSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer without nested videos."""

    class Meta:
        model = Playlist
        fields = [
            "id",
            "youtube_playlist_id",
            "title",
            "channel_title",
            "thumbnail_url",
            "description",
            "video_count",
            "published_at",
            "source_type",
            "is_hidden",
            "is_unlinked",
            "created_at",
        ]


class PlaylistSerializer(serializers.ModelSerializer):
    videos = VideoSerializer(many=True, read_only=True)

    class Meta:
        model = Playlist
        fields = [
            "id",
            "youtube_playlist_id",
            "title",
            "channel_title",
            "thumbnail_url",
            "description",
            "video_count",
            "published_at",
            "source_type",
            "is_hidden",
            "is_unlinked",
            "created_at",
            "videos",
        ]


class VideoNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoNote
        fields = ["video_id", "body_markdown", "updated_at"]
        read_only_fields = ["video_id", "updated_at"]


class LinkPlaylistByUrlSerializer(serializers.Serializer):
    url = serializers.URLField()

    def validate(self, attrs):
        parsed = urlparse(attrs["url"])
        params = parse_qs(parsed.query)
        playlist_ids = params.get("list")
        if not playlist_ids or not playlist_ids[0]:
            raise serializers.ValidationError(
                {
                    "url": "URL does not contain a valid YouTube playlist ID "
                    "(list= parameter)."
                }
            )
        attrs["playlist_id"] = playlist_ids[0]
        return attrs
