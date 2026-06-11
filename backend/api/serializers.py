from django.contrib.auth import authenticate, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import serializers

from .models import Note, Playlist, Video


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "email", "password")
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True, "allow_blank": False},
        }

    def validate_username(self, value):
        if User.objects.filter(Q(username__iexact=value)).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(Q(email__iexact=value)).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        temp_user = User(**attrs)
        try:
            password_validation.validate_password(attrs["password"], user=temp_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            username=attrs["username"],
            password=attrs["password"],
        )

        if user is None:
            raise serializers.ValidationError(
                {"detail": "Invalid username or password."}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account is inactive."}
            )

        attrs["user"] = user
        return attrs


# ── Playlist / Video serializers ─────────────────────────────────────────


class PlaylistUrlImportSerializer(serializers.Serializer):
    url = serializers.CharField(required=True, allow_blank=False)


class PersonalVideoImportSerializer(serializers.Serializer):
    url = serializers.CharField(required=True, allow_blank=False)


class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = (
            "id",
            "youtube_video_id",
            "position",
            "title",
            "channel_title",
            "duration",
            "thumbnail_url",
            "published_at",
            "view_count",
            "is_removed",
        )


class PlaylistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = (
            "id",
            "youtube_playlist_id",
            "title",
            "channel_title",
            "thumbnail_url",
            "video_count",
            "description",
            "published_at",
            "source",
            "is_unlinked",
        )


class PlaylistDetailSerializer(serializers.ModelSerializer):
    videos = VideoSerializer(many=True, read_only=True)

    class Meta:
        model = Playlist
        fields = (
            "id",
            "youtube_playlist_id",
            "title",
            "channel_title",
            "thumbnail_url",
            "video_count",
            "description",
            "published_at",
            "source",
            "is_unlinked",
            "videos",
        )


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ("id", "youtube_video_id", "content", "created_at", "updated_at")
        read_only_fields = ("id", "youtube_video_id", "created_at", "updated_at")
        extra_kwargs = {"content": {"required": True, "allow_blank": True}}
