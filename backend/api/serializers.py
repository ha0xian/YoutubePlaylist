from urllib.parse import parse_qs, urlparse
from rest_framework import serializers
from .models import Playlist, Video, VideoNote
class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ["id","youtube_video_id","title","channel_title","duration","thumbnail_url","published_at","view_count","position","is_removed"]
class PlaylistSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = ["id","youtube_playlist_id","title","channel_title","thumbnail_url","description","video_count","published_at","source_type","is_hidden","is_unlinked","created_at"]
class PlaylistSerializer(serializers.ModelSerializer):
    videos = VideoSerializer(many=True, read_only=True)
    class Meta:
        model = Playlist
        fields = ["id","youtube_playlist_id","title","channel_title","thumbnail_url","description","video_count","published_at","source_type","is_hidden","is_unlinked","created_at","videos"]
class VideoNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoNote
        fields = ["video_id","body_markdown","updated_at"]
        read_only_fields = ["video_id","updated_at"]
class LinkPlaylistByUrlSerializer(serializers.Serializer):
    url = serializers.URLField()
    def validate(self, attrs):
        pids = parse_qs(urlparse(attrs["url"]).query).get("list")
        if not pids or not pids[0]:
            raise serializers.ValidationError({"url":"URL does not contain a valid YouTube playlist ID."})
        attrs["playlist_id"] = pids[0]
        return attrs
