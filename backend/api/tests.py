from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Playlist, SourceType, Video, VideoNote, YouTubeOAuthToken

User = get_user_model()


# ============================================================================
# Existing model and utility tests (from slice 01)
# ============================================================================


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


# ============================================================================
# API endpoint tests (slice 02)
# ============================================================================


def _create_user_and_token(
    username="testuser", password="StrongPass123!"
) -> tuple:
    """Helper to create a user with an auth token. Returns (user, token_key)."""
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=password,
    )
    token = Token.objects.create(user=user)
    return user, token.key


# ---- OAuth Initiate -------------------------------------------------------


@override_settings(
    GOOGLE_OAUTH_CLIENT_ID="test-client-id.apps.googleusercontent.com",
)
class TestOAuthInitiate(APITestCase):
    def test_auth_url_returns_valid_url(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.get("/api/youtube/auth-url/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("auth_url", response.data)
        self.assertTrue(
            response.data["auth_url"].startswith("https://accounts.google.com/o/oauth2/auth")
        )

    def test_auth_url_includes_scopes_and_client_id(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.get("/api/youtube/auth-url/")
        url = response.data["auth_url"]
        self.assertIn("client_id=test-client-id.apps.googleusercontent.com", url)
        self.assertIn("youtube.readonly", url)
        self.assertIn("response_type=code", url)
        self.assertIn("access_type=offline", url)

    def test_requires_authentication(self):
        response = self.client.get("/api/youtube/auth-url/")
        self.assertIn(response.status_code, [401, 403])


# ---- OAuth Callback -------------------------------------------------------


class TestOAuthCallback(APITestCase):
    def _mock_token_response(self, *args, **kwargs):
        return {
            "access_token": "ya29.mock_access_token",
            "refresh_token": "1//mock_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer",
        }

    def _mock_playlists_response(self, *args, **kwargs):
        return [
            {
                "id": "PL12345",
                "snippet": {
                    "title": "OAuth Playlist",
                    "description": "Imported via OAuth",
                    "channelTitle": "My Channel",
                    "thumbnails": {
                        "default": {"url": "https://example.com/thumb.jpg"}
                    },
                    "publishedAt": "2024-01-15T19:00:49Z",
                },
                "contentDetails": {"itemCount": 3},
            },
        ]

    @patch("api.encryption.encrypt_token", return_value=b"encrypted_value")
    @patch("api.views.youtube_service.fetch_playlists")
    @patch("api.views.youtube_service.exchange_oauth_code")
    def test_valid_code_returns_playlists(
        self,
        mock_exchange,
        mock_fetch_playlists,
        mock_encrypt,
    ):
        mock_exchange.side_effect = self._mock_token_response
        mock_fetch_playlists.side_effect = self._mock_playlists_response

        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.post(
            "/api/youtube/callback/", {"code": "valid_auth_code"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("playlists", response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["playlists"][0]["youtube_playlist_id"], "PL12345"
        )

        # Verify token was stored
        self.assertTrue(
            YouTubeOAuthToken.objects.filter(user__username="testuser").exists()
        )

    def test_empty_code_returns_400(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.post(
            "/api/youtube/callback/", {"code": ""}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_requires_authentication(self):
        response = self.client.post(
            "/api/youtube/callback/", {"code": "some_code"}, format="json"
        )
        self.assertIn(response.status_code, [401, 403])


# ---- Playlist List --------------------------------------------------------


class TestPlaylistList(APITestCase):
    def test_no_playlists_returns_empty_list(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.get("/api/playlists/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_returns_user_playlists(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL111",
            title="Visible Playlist",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )

        response = self.client.get("/api/playlists/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Visible Playlist")

    def test_hidden_playlists_excluded(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL222",
            title="Hidden Playlist",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
            is_hidden=True,
        )

        response = self.client.get("/api/playlists/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_unlinked_playlists_excluded(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL333",
            title="Unlinked Playlist",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.OAUTH,
            is_unlinked=True,
        )

        response = self.client.get("/api/playlists/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_requires_authentication(self):
        response = self.client.get("/api/playlists/")
        self.assertIn(response.status_code, [401, 403])


# ---- Playlist Detail ------------------------------------------------------


class TestPlaylistDetail(APITestCase):
    def test_returns_playlist_with_videos(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL999",
            title="Detail Test",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )
        Video.objects.create(
            playlist=playlist,
            youtube_video_id="vid001",
            title="Nested Video",
            channel_title="Channel",
            duration="PT5M",
            thumbnail_url="https://example.com/vid.jpg",
            position=0,
        )

        response = self.client.get(f"/api/playlists/{playlist.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "Detail Test")
        self.assertIn("videos", response.data)
        self.assertEqual(len(response.data["videos"]), 1)
        self.assertEqual(response.data["videos"][0]["youtube_video_id"], "vid001")

    def test_returns_404_for_other_user(self):
        user1, _ = _create_user_and_token("user1")
        user2, token2 = _create_user_and_token("user2")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token2}")

        playlist = Playlist.objects.create(
            user=user1,
            youtube_playlist_id="PL555",
            title="Other User's",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )

        response = self.client.get(f"/api/playlists/{playlist.pk}/")
        self.assertEqual(response.status_code, 404)

    def test_returns_404_for_nonexistent(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.get("/api/playlists/99999/")
        self.assertEqual(response.status_code, 404)


# ---- Link Playlist By URL -------------------------------------------------


def _mock_playlist_items(*args, **kwargs):
    """Return playlist items as the YouTube API would."""
    return [
        {
            "snippet": {
                "title": "Test Playlist",
                "description": "A test playlist",
                "channelTitle": "Test Channel",
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": "vid001",
                },
                "thumbnails": {
                    "default": {"url": "https://example.com/thumb.jpg"}
                },
                "publishedAt": "2024-01-15T19:00:49Z",
            },
            "contentDetails": {
                "videoId": "vid001",
                "videoPublishedAt": "2024-01-15T19:00:49Z",
            },
        },
        {
            "snippet": {
                "title": "Video Two",
                "description": "Second video",
                "channelTitle": "Test Channel",
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": "vid002",
                },
                "thumbnails": {
                    "default": {"url": "https://example.com/thumb2.jpg"}
                },
                "publishedAt": "2024-01-16T12:00:00Z",
            },
            "contentDetails": {
                "videoId": "vid002",
                "videoPublishedAt": "2024-01-16T12:00:00Z",
            },
        },
    ]


def _mock_video_details(*args, **kwargs):
    """Return video details as the YouTube API would."""
    return [
        {
            "id": "vid001",
            "snippet": {"channelTitle": "Test Channel"},
            "contentDetails": {"duration": "PT5M30S"},
            "statistics": {"viewCount": "1234"},
        },
        {
            "id": "vid002",
            "snippet": {"channelTitle": "Test Channel"},
            "contentDetails": {"duration": "PT10M15S"},
            "statistics": {"viewCount": "5678"},
        },
    ]


@override_settings(YOUTUBE_API_KEY="test-api-key")
class TestLinkPlaylistByUrl(APITestCase):
    @patch("api.views.youtube_service.fetch_video_details")
    @patch("api.views.youtube_service.fetch_playlist_items")
    def test_valid_url_creates_playlist_and_videos(
        self, mock_fetch_items, mock_fetch_details
    ):
        mock_fetch_items.side_effect = _mock_playlist_items
        mock_fetch_details.side_effect = _mock_video_details

        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.post(
            "/api/playlists/link/",
            {"url": "https://www.youtube.com/playlist?list=PL12345"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["youtube_playlist_id"], "PL12345")
        self.assertEqual(response.data["title"], "Test Playlist")
        self.assertEqual(response.data["source_type"], "url")
        self.assertIn("videos", response.data)
        self.assertEqual(len(response.data["videos"]), 2)

    @patch("api.views.youtube_service.fetch_video_details")
    @patch("api.views.youtube_service.fetch_playlist_items")
    def test_duplicate_url_updates_existing(
        self, mock_fetch_items, mock_fetch_details
    ):
        mock_fetch_items.side_effect = _mock_playlist_items
        mock_fetch_details.side_effect = _mock_video_details

        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        # First import
        self.client.post(
            "/api/playlists/link/",
            {"url": "https://www.youtube.com/playlist?list=PL12345"},
            format="json",
        )
        self.assertEqual(Playlist.objects.count(), 1)

        # Second import (duplicate)
        response = self.client.post(
            "/api/playlists/link/",
            {"url": "https://www.youtube.com/playlist?list=PL12345"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Playlist.objects.count(), 1)  # no duplicate

    def test_invalid_url_returns_400(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        # URL without list parameter
        response = self.client.post(
            "/api/playlists/link/",
            {"url": "https://www.youtube.com/watch?v=abc123"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    @patch("api.views.youtube_service.fetch_playlist_items")
    def test_invalid_url_includes_url_in_response(self, mock_fetch_items):
        mock_fetch_items.side_effect = Exception("API error")
        # The view catches requests.RequestException but we mock a generic
        # Exception to test error path -- actually let's use requests exception.
        import requests

        mock_fetch_items.side_effect = requests.RequestException("Not found")

        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.post(
            "/api/playlists/link/",
            {"url": "https://www.youtube.com/playlist?list=PLINVALID"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("url", response.data)
        self.assertIn("detail", response.data)

    @override_settings(YOUTUBE_API_KEY="")
    def test_missing_api_key_returns_503(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.post(
            "/api/playlists/link/",
            {"url": "https://www.youtube.com/playlist?list=PL12345"},
            format="json",
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn("detail", response.data)


# ---- Hide Playlist --------------------------------------------------------


class TestHidePlaylist(APITestCase):
    def test_hiding_sets_is_hidden(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL444",
            title="To Hide",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )

        response = self.client.post(f"/api/playlists/{playlist.pk}/hide/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Playlist hidden.")

        playlist.refresh_from_db()
        self.assertTrue(playlist.is_hidden)

    def test_hidden_appears_in_hidden_list(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL555",
            title="Hidden One",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
            is_hidden=True,
        )

        response = self.client.get("/api/playlists/hidden/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], playlist.pk)

    def test_hiding_other_user_returns_404(self):
        user1, _ = _create_user_and_token("user1")
        user2, token2 = _create_user_and_token("user2")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token2}")

        playlist = Playlist.objects.create(
            user=user1,
            youtube_playlist_id="PL666",
            title="Mine",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )

        response = self.client.post(f"/api/playlists/{playlist.pk}/hide/")
        self.assertEqual(response.status_code, 404)


# ---- Unlink Playlist ------------------------------------------------------


class TestUnlinkPlaylist(APITestCase):
    def test_unlinking_sets_is_unlinked(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL777",
            title="To Unlink",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.OAUTH,
        )

        response = self.client.post(f"/api/playlists/{playlist.pk}/unlink/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Playlist unlinked.")

        playlist.refresh_from_db()
        self.assertTrue(playlist.is_unlinked)

    def test_unlinking_other_user_returns_404(self):
        user1, _ = _create_user_and_token("user1")
        user2, token2 = _create_user_and_token("user2")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token2}")

        playlist = Playlist.objects.create(
            user=user1,
            youtube_playlist_id="PL888",
            title="Mine",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )

        response = self.client.post(f"/api/playlists/{playlist.pk}/unlink/")
        self.assertEqual(response.status_code, 404)


# ---- Disconnect YouTube ---------------------------------------------------


class TestDisconnectYouTube(APITestCase):
    def test_disconnect_deletes_token_and_marks_oauth_unlinked(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        # Create OAuth token and an OAuth-sourced playlist
        YouTubeOAuthToken.objects.create(
            user=user,
            access_token=b"encrypted_token",
            refresh_token=b"encrypted_refresh",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL_OAUTH",
            title="OAuth Playlist",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.OAUTH,
        )

        response = self.client.post("/api/youtube/disconnect/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "YouTube account disconnected.")

        # Token should be deleted
        self.assertFalse(
            YouTubeOAuthToken.objects.filter(user=user).exists()
        )

        # OAuth playlist should be marked unlinked
        playlist = Playlist.objects.get(
            user=user, youtube_playlist_id="PL_OAUTH"
        )
        self.assertTrue(playlist.is_unlinked)

    def test_url_playlists_not_affected(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        YouTubeOAuthToken.objects.create(
            user=user,
            access_token=b"tok",
        )
        url_playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL_URL",
            title="URL Playlist",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )

        self.client.post("/api/youtube/disconnect/")
        url_playlist.refresh_from_db()
        self.assertFalse(url_playlist.is_unlinked)

    def test_disconnect_without_account_returns_200(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.post("/api/youtube/disconnect/")
        self.assertEqual(response.status_code, 200)


# ---- Video Notes ----------------------------------------------------------


class TestVideoNote(APITestCase):
    def _create_playlist_with_video(self, user) -> Video:
        playlist = Playlist.objects.create(
            user=user,
            youtube_playlist_id="PL_NOTES",
            title="Notes Playlist",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )
        return Video.objects.create(
            playlist=playlist,
            youtube_video_id="vid_notes_001",
            title="Note Video",
            channel_title="Channel",
            duration="PT5M",
            thumbnail_url="https://example.com/vid.jpg",
            position=0,
        )

    def test_get_note_returns_existing_note(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        video = self._create_playlist_with_video(user)
        VideoNote.objects.create(
            user=user,
            video=video,
            body_markdown="**bold** markdown note",
        )

        response = self.client.get(f"/api/notes/{video.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["video_id"], video.pk)
        self.assertEqual(response.data["body_markdown"], "**bold** markdown note")
        self.assertIsNotNone(response.data["updated_at"])

    def test_get_note_returns_empty_when_none_exists(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        video = self._create_playlist_with_video(user)

        response = self.client.get(f"/api/notes/{video.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["video_id"], video.pk)
        self.assertEqual(response.data["body_markdown"], "")
        self.assertIsNone(response.data["updated_at"])

    def test_get_note_returns_404_for_nonexistent_video(self):
        _, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        response = self.client.get("/api/notes/99999/")
        self.assertEqual(response.status_code, 404)

    def test_put_note_saves_markdown(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        video = self._create_playlist_with_video(user)

        response = self.client.put(
            f"/api/notes/{video.pk}/",
            {"body_markdown": "New note content"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["video_id"], video.pk)
        self.assertEqual(response.data["body_markdown"], "New note content")

        # Verify it persisted
        note = VideoNote.objects.get(user=user, video=video)
        self.assertEqual(note.body_markdown, "New note content")

    def test_put_note_updates_existing(self):
        user, token_key = _create_user_and_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")

        video = self._create_playlist_with_video(user)
        VideoNote.objects.create(
            user=user, video=video, body_markdown="Original"
        )

        response = self.client.put(
            f"/api/notes/{video.pk}/",
            {"body_markdown": "Updated note"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["body_markdown"], "Updated note")

        # Should still be one note (updated, not duplicated)
        self.assertEqual(VideoNote.objects.filter(video=video).count(), 1)

    def test_notes_scoped_by_user(self):
        user1, tok1 = _create_user_and_token("user1notes")
        user2, tok2 = _create_user_and_token("user2notes")

        video1 = self._create_playlist_with_video(user1)
        # user1 creates a note
        VideoNote.objects.create(
            user=user1, video=video1, body_markdown="User1 note"
        )

        # user2 should not see user1's note
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tok2}")
        response = self.client.get(f"/api/notes/{video1.pk}/")
        self.assertEqual(response.status_code, 404)

        # user2 can create their own note for the same video
        # First, user2 needs their own playlist with the video
        playlist2 = Playlist.objects.create(
            user=user2,
            youtube_playlist_id="PL_NOTES2",
            title="Notes Playlist 2",
            channel_title="Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source_type=SourceType.URL,
        )
        video2 = Video.objects.create(
            playlist=playlist2,
            youtube_video_id="vid_notes_002",
            title="Note Video 2",
            channel_title="Channel",
            duration="PT5M",
            thumbnail_url="https://example.com/vid.jpg",
            position=0,
        )

        response = self.client.put(
            f"/api/notes/{video2.pk}/",
            {"body_markdown": "User2's note"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["body_markdown"], "User2's note")
