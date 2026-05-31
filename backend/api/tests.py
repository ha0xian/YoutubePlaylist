from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Playlist, SourceType, Video, YouTubeOAuthToken

User = get_user_model()


class TestYouTubeOAuthTokenModel(APITestCase):
    def test_create_token_and_read_fields(self):
        user = User.objects.create_user(
            username="youtubetest",
            email="youtube@example.com",
            password="StrongPass123!",
        )
        token = YouTubeOAuthToken.objects.create(
            user=user,
            access_token=b"encrypted_access_token",
            refresh_token=b"encrypted_refresh_token",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.assertEqual(token.user, user)
        self.assertEqual(token.access_token, b"encrypted_access_token")
        self.assertEqual(token.token_type, "Bearer")
        self.assertIsNotNone(token.expires_at)
        self.assertIsNotNone(token.created_at)
        self.assertIsNotNone(token.updated_at)

    def test_token_str_returns_expected_format(self):
        user = User.objects.create_user(
            username="strtest",
            email="str@example.com",
            password="StrongPass123!",
        )
        token = YouTubeOAuthToken.objects.create(
            user=user, access_token=b"tok"
        )
        self.assertIn("strtest", str(token))
        self.assertIn("YouTube", str(token))


class TestPlaylistModel(APITestCase):
    def test_create_playlist_and_video_relationship(self):
        user = User.objects.create_user(
            username="playlisttest",
            email="playlist@example.com",
            password="StrongPass123!",
        )
        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL12345",
            title="Test Playlist",
            channel_title="Test Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            description="A test playlist",
            video_count=5,
            source_type=SourceType.OAUTH,
        )
        video1 = Video.objects.create(
            playlist=playlist,
            youtube_video_id="vid001",
            title="Video One",
            channel_title="Test Channel",
            duration="PT5M30S",
            thumbnail_url="https://example.com/vid1.jpg",
            position=0,
        )
        Video.objects.create(
            playlist=playlist,
            youtube_video_id="vid002",
            title="Video Two",
            channel_title="Test Channel",
            duration="PT10M15S",
            thumbnail_url="https://example.com/vid2.jpg",
            position=1,
        )

        self.assertEqual(playlist.videos.count(), 2)
        self.assertEqual(playlist.user, user)
        self.assertEqual(playlist.source_type, SourceType.OAUTH)

        # Videos should be ordered by position
        videos = list(playlist.videos.all())
        self.assertEqual(videos[0].position, 0)
        self.assertEqual(videos[1].position, 1)

        # Relationship from video back to playlist
        self.assertEqual(video1.playlist, playlist)

    def test_playlist_unique_together_constraint(self):
        user = User.objects.create_user(
            username="uniqueuser",
            email="unique@example.com",
            password="StrongPass123!",
        )
        Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL12345",
            title="Original",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )
        with self.assertRaises(Exception):
            Playlist.objects.create(
                user=user,
                youtube_playlist_id="PL12345",
                title="Duplicate",
                channel_title="Channel",
                thumbnail_url="https://example.com/thumb.jpg",
                source_type=SourceType.URL,
            )

    def test_video_unique_together_constraint(self):
        user = User.objects.create_user(
            username="videounique",
            email="vu@example.com",
            password="StrongPass123!",
        )
        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL999",
            title="Vid Test",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )
        Video.objects.create(
            playlist=playlist,
            youtube_video_id="vid001",
            title="First",
            channel_title="Channel",
            duration="PT1M",
            thumbnail_url="https://example.com/v.jpg",
            position=0,
        )
        with self.assertRaises(Exception):
            Video.objects.create(
                playlist=playlist,
                youtube_video_id="vid001",
                title="Second",
                channel_title="Channel",
                duration="PT2M",
                thumbnail_url="https://example.com/v.jpg",
                position=1,
            )

    def test_soft_delete_flag_defaults_to_false(self):
        user = User.objects.create_user(
            username="softdel",
            email="sd@example.com",
            password="StrongPass123!",
        )
        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL888",
            title="Soft Delete Test",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )
        video = Video.objects.create(
            playlist=playlist,
            youtube_video_id="vid003",
            title="Video Three",
            channel_title="Channel",
            duration="PT3M",
            thumbnail_url="https://example.com/v.jpg",
            position=0,
        )
        self.assertFalse(playlist.is_deleted)
        self.assertFalse(video.is_deleted)


class TestEncryption(APITestCase):
    def test_encrypt_decrypt_round_trip(self):
        from .encryption import decrypt_token, encrypt_token

        plain = "ya29.a0AfH6SMC..."
        encrypted = encrypt_token(plain)
        self.assertIsInstance(encrypted, bytes)
        self.assertNotEqual(encrypted, plain.encode())

        decrypted = decrypt_token(encrypted)
        self.assertEqual(decrypted, plain)

    def test_decrypt_invalid_data_raises_value_error(self):
        from .encryption import decrypt_token

        with self.assertRaises(ValueError):
            decrypt_token(b"not-a-valid-encrypted-token")

    def test_encrypt_empty_string(self):
        from .encryption import encrypt_token, decrypt_token

        encrypted = encrypt_token("")
        decrypted = decrypt_token(encrypted)
        self.assertEqual(decrypted, "")


class TestFormatDuration(APITestCase):
    def test_format_duration_hms(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration("PT1H2M3S"), "1:02:03")

    def test_format_duration_ms(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration("PT5M30S"), "5:30")

    def test_format_duration_s(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration("PT45S"), "0:45")

    def test_format_duration_with_days(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration("P1DT2H3M4S"), "26:03:04")

    def test_format_duration_zero(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration("PT0S"), "0:00")

    def test_format_duration_empty(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration(""), "0:00")

    def test_format_duration_invalid(self):
        from .youtube_service import format_duration

        self.assertEqual(format_duration("not-a-duration"), "0:00")
