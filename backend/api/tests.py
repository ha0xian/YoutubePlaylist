from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


# ── Helper factories ──────────────────────────────────────────────────────

def _playlist_snippet(playlist_id="PLtest123456789", title="Test Playlist"):
    return {
        "snippet": {
            "title": title,
            "channelTitle": "Test Channel",
            "description": "A test playlist description.",
            "publishedAt": "2026-01-15T12:00:00Z",
            "thumbnails": {
                "medium": {"url": f"https://i.ytimg.com/vi/test/mqdefault.jpg"}
            },
        },
        "contentDetails": {"itemCount": 2},
    }


def _playlist_items(playlist_id="PLtest123456789"):
    return [
        {
            "snippet": {
                "title": "Video One",
                "channelTitle": "Test Channel",
                "position": 0,
                "resourceId": {"videoId": "vid00000001"},
                "publishedAt": "2026-01-10T10:00:00Z",
                "thumbnails": {
                    "default": {"url": "https://i.ytimg.com/vi/vid00000001/default.jpg"}
                },
            },
        },
        {
            "snippet": {
                "title": "Video Two",
                "channelTitle": "Test Channel",
                "position": 1,
                "resourceId": {"videoId": "vid00000002"},
                "publishedAt": "2026-01-12T10:00:00Z",
                "thumbnails": {
                    "default": {"url": "https://i.ytimg.com/vi/vid00000002/default.jpg"}
                },
            },
        },
    ]


def _video_details(video_ids):
    details = {}
    for vid in video_ids:
        details[vid] = {
            "id": vid,
            "snippet": {
                "title": f"Video {vid}",
                "channelTitle": "Test Channel",
                "publishedAt": "2026-01-10T10:00:00Z",
                "thumbnails": {
                    "default": {"url": f"https://i.ytimg.com/vi/{vid}/default.jpg"}
                },
            },
            "contentDetails": {"duration": "PT5M30S"},
            "statistics": {"viewCount": "1000"},
        }
    return details


# ── Auth tests (unchanged) ─────────────────────────────────────────────────


class AuthRegisterTests(APITestCase):
    def setUp(self):
        self.register_url = "/api/auth/register/"
        self.valid_payload = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "AStrongP4ssword!",
        }

    def test_register_creates_user_and_returns_token(self):
        response = self.client.post(self.register_url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        user_data = response.data["user"]
        self.assertEqual(user_data["username"], "testuser")
        self.assertEqual(user_data["email"], "testuser@example.com")
        self.assertIn("id", user_data)
        self.assertNotIn("password", user_data)

        # Verify the user was actually created
        self.assertTrue(User.objects.filter(username="testuser").exists())

        # Verify the token is valid
        token_key = response.data["token"]
        self.assertTrue(Token.objects.filter(key=token_key).exists())

    def test_register_rejects_duplicate_username(self):
        # First registration succeeds
        self.client.post(self.register_url, self.valid_payload, format="json")

        # Second registration with same username but different case
        duplicate = {
            "username": "TestUser",
            "email": "other@example.com",
            "password": "AStrongP4ssword!",
        }
        response = self.client.post(self.register_url, duplicate, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_rejects_duplicate_email(self):
        # First registration succeeds
        self.client.post(self.register_url, self.valid_payload, format="json")

        # Second registration with same email but different case
        duplicate = {
            "username": "otheruser",
            "email": "TestUser@Example.com",
            "password": "AStrongP4ssword!",
        }
        response = self.client.post(self.register_url, duplicate, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_rejects_weak_password(self):
        weak = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "abc",
        }
        response = self.client.post(self.register_url, weak, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_register_rejects_missing_username(self):
        payload = {
            "email": "someone@example.com",
            "password": "AStrongP4ssword!",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_rejects_missing_email(self):
        payload = {
            "username": "someone",
            "password": "AStrongP4ssword!",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_rejects_missing_password(self):
        payload = {
            "username": "someone",
            "email": "someone@example.com",
        }
        response = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)


class AuthLoginTests(APITestCase):
    def setUp(self):
        self.login_url = "/api/auth/login/"
        self.username = "loginuser"
        self.password = "AStrongP4ssword!"
        self.user = User.objects.create_user(
            username=self.username,
            email="loginuser@example.com",
            password=self.password,
        )

    def test_login_returns_existing_user_token(self):
        response = self.client.post(
            self.login_url,
            {"username": self.username, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], self.username)
        self.assertEqual(response.data["user"]["email"], "loginuser@example.com")
        self.assertNotIn("password", response.data["user"])

        # Verify the returned token is valid
        token_key = response.data["token"]
        token = Token.objects.get(key=token_key)
        self.assertEqual(token.user, self.user)

    def test_login_returns_same_token_on_subsequent_login(self):
        first = self.client.post(
            self.login_url,
            {"username": self.username, "password": self.password},
            format="json",
        )
        second = self.client.post(
            self.login_url,
            {"username": self.username, "password": self.password},
            format="json",
        )
        self.assertEqual(first.data["token"], second.data["token"])

    def test_login_rejects_invalid_password(self):
        response = self.client.post(
            self.login_url,
            {"username": self.username, "password": "WrongPassword1!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_login_rejects_nonexistent_user(self):
        response = self.client.post(
            self.login_url,
            {"username": "nobody", "password": "SomePass1!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_login_rejects_inactive_user(self):
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            self.login_url,
            {"username": self.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_login_rejects_missing_username(self):
        response = self.client.post(
            self.login_url,
            {"password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_login_rejects_missing_password(self):
        response = self.client.post(
            self.login_url,
            {"username": self.username},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)


class AuthCurrentUserTests(APITestCase):
    def setUp(self):
        self.me_url = "/api/auth/me/"
        self.user = User.objects.create_user(
            username="meuser",
            email="meuser@example.com",
            password="AStrongP4ssword!",
        )
        self.token = Token.objects.create(user=self.user)

    def test_current_user_requires_token(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_rejects_malformed_token(self):
        response = self.client.get(
            self.me_url,
            HTTP_AUTHORIZATION="Token notarealtokenatall",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_returns_authenticated_user(self):
        response = self.client.get(
            self.me_url,
            HTTP_AUTHORIZATION=f"Token {self.token.key}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["username"], "meuser")
        self.assertEqual(response.data["email"], "meuser@example.com")
        self.assertNotIn("password", response.data)

    def test_current_user_for_deleted_user_returns_401(self):
        token_key = self.token.key
        self.user.delete()

        response = self.client.get(
            self.me_url,
            HTTP_AUTHORIZATION=f"Token {token_key}",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ── Playlist API tests ────────────────────────────────────────────────────


class PlaylistImportAuthTests(APITestCase):
    """Import endpoint requires an authenticated user."""

    def setUp(self):
        self.import_url = "/api/playlists/import/"
        self.valid_url = "https://www.youtube.com/playlist?list=PLtest123456789"

    def test_import_rejects_unauthenticated(self):
        response = self.client.post(
            self.import_url, {"url": self.valid_url}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_import_rejects_malformed_token(self):
        response = self.client.post(
            self.import_url,
            {"url": self.valid_url},
            format="json",
            HTTP_AUTHORIZATION="Token faketoken12345",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PlaylistImportSuccessTests(APITestCase):
    """Happy-path import with mocked YouTube API responses."""

    def setUp(self):
        self.import_url = "/api/playlists/import/"
        self.valid_url = "https://www.youtube.com/playlist?list=PLtest123456789"
        self.user = User.objects.create_user(
            username="importer", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def _post_import(self, url=None):
        return self.client.post(
            self.import_url,
            {"url": url or self.valid_url},
            format="json",
            **self._auth_header(),
        )

    @patch("api.youtube._fetch_video_details")
    @patch("api.youtube._fetch_playlist_items")
    @patch("api.youtube._fetch_playlist_snippet")
    def test_import_creates_playlist_and_videos(self, mock_snippet, mock_items, mock_videos):
        """First import with a valid URL creates playlist and video rows."""
        mock_snippet.return_value = _playlist_snippet()
        mock_items.return_value = _playlist_items()
        mock_videos.return_value = _video_details(["vid00000001", "vid00000002"])

        response = self._post_import()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.data
        self.assertEqual(data["title"], "Test Playlist")
        self.assertEqual(data["channel_title"], "Test Channel")
        self.assertEqual(data["youtube_playlist_id"], "PLtest123456789")
        self.assertEqual(data["source"], "url")
        self.assertEqual(len(data["videos"]), 2)
        self.assertEqual(data["videos"][0]["youtube_video_id"], "vid00000001")
        self.assertEqual(data["videos"][0]["position"], 0)

        # Database verification
        from .models import Playlist, Video

        self.assertEqual(Playlist.objects.filter(user=self.user).count(), 1)
        playlist = Playlist.objects.get(user=self.user)
        self.assertEqual(Video.objects.filter(playlist=playlist).count(), 2)

    @patch("api.youtube._fetch_video_details")
    @patch("api.youtube._fetch_playlist_items")
    @patch("api.youtube._fetch_playlist_snippet")
    def test_reimport_updates_existing_playlist(self, mock_snippet, mock_items, mock_videos):
        """Re-importing the same URL for the same user updates, no duplicates."""
        mock_snippet.return_value = _playlist_snippet(title="Old Title")
        mock_items.return_value = _playlist_items()
        mock_videos.return_value = _video_details(["vid00000001", "vid00000002"])

        # First import
        response1 = self._post_import()
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Change the title for the second import
        mock_snippet.return_value = _playlist_snippet(title="Updated Title")

        # Second import
        response2 = self._post_import()
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data["title"], "Updated Title")

        from .models import Playlist

        # Only one playlist row
        self.assertEqual(
            Playlist.objects.filter(
                user=self.user, youtube_playlist_id="PLtest123456789"
            ).count(),
            1,
        )

    @patch("api.youtube._fetch_video_details")
    @patch("api.youtube._fetch_playlist_items")
    @patch("api.youtube._fetch_playlist_snippet")
    def test_two_users_can_import_same_playlist(self, mock_snippet, mock_items, mock_videos):
        """Two different users importing the same YouTube playlist get separate rows."""
        mock_snippet.return_value = _playlist_snippet()
        mock_items.return_value = _playlist_items()
        mock_videos.return_value = _video_details(["vid00000001", "vid00000002"])

        # First user import
        response1 = self._post_import()
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Second user import
        user2 = User.objects.create_user(
            username="importer2", password="AStrongP4ssword!"
        )
        token2 = Token.objects.create(user=user2)
        response2 = self.client.post(
            self.import_url,
            {"url": self.valid_url},
            format="json",
            HTTP_AUTHORIZATION=f"Token {token2.key}",
        )
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)

        # Verify two separate playlist rows
        from .models import Playlist

        self.assertEqual(
            Playlist.objects.filter(
                youtube_playlist_id="PLtest123456789"
            ).count(),
            2,
        )
        self.assertNotEqual(response1.data["id"], response2.data["id"])


class PlaylistImportErrorTests(APITestCase):
    """Error cases for playlist import."""

    def setUp(self):
        self.import_url = "/api/playlists/import/"
        self.user = User.objects.create_user(
            username="importer", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def _post(self, url):
        return self.client.post(
            self.import_url, {"url": url}, format="json", **self._auth_header()
        )

    def test_import_rejects_blank_url(self):
        response = self._post("")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_rejects_missing_url(self):
        response = self.client.post(
            self.import_url, {}, format="json", **self._auth_header()
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_import_rejects_non_youtube_url(self):
        response = self._post("https://example.com/video")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not look like a YouTube URL", response.data["detail"])

    def test_import_rejects_url_without_list_param(self):
        response = self._post("https://www.youtube.com/watch?v=abc123")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No playlist ID found", response.data["detail"])

    def test_import_preserves_url_in_error_response(self):
        bad_url = "https://example.com/video"
        response = self._post(bad_url)
        self.assertIn("url", response.data)
        self.assertEqual(response.data["url"], bad_url)

    @patch("api.youtube._fetch_playlist_snippet")
    def test_import_handles_youtube_api_failure(self, mock_snippet):
        """When YouTube API raises an error it is reported as 502."""
        mock_snippet.side_effect = __import__("api.youtube", fromlist=[""]).YouTubeAPIError(
            "Quota exceeded"
        )

        response = self._post("https://www.youtube.com/playlist?list=PLtest123456789")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("Quota exceeded", response.data["detail"])


class PlaylistListTests(APITestCase):
    """Playlist list endpoint scoping."""

    def setUp(self):
        self.list_url = "/api/playlists/"
        self.user_a = User.objects.create_user(
            username="userA", password="AStrongP4ssword!"
        )
        self.user_b = User.objects.create_user(
            username="userB", password="AStrongP4ssword!"
        )
        self.token_a = Token.objects.create(user=self.user_a)
        self.token_b = Token.objects.create(user=self.user_b)

        from .models import Playlist

        self.p_a = Playlist.objects.create(
            user=self.user_a,
            youtube_playlist_id="PLuserA1",
            title="A's Playlist",
            channel_title="ChanA",
            thumbnail_url="https://example.com/thumb.jpg",
        )
        self.p_b = Playlist.objects.create(
            user=self.user_b,
            youtube_playlist_id="PLuserB1",
            title="B's Playlist",
            channel_title="ChanB",
            thumbnail_url="https://example.com/thumb.jpg",
        )

    def test_list_requires_auth(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_only_own_playlists(self):
        response = self.client.get(
            self.list_url,
            HTTP_AUTHORIZATION=f"Token {self.token_a.key}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "A's Playlist")


class PlaylistDetailTests(APITestCase):
    """Playlist detail scoping."""

    def setUp(self):
        self.user_a = User.objects.create_user(
            username="userA", password="AStrongP4ssword!"
        )
        self.user_b = User.objects.create_user(
            username="userB", password="AStrongP4ssword!"
        )
        self.token_a = Token.objects.create(user=self.user_a)
        self.token_b = Token.objects.create(user=self.user_b)

        from .models import Playlist

        self.p_a = Playlist.objects.create(
            user=self.user_a,
            youtube_playlist_id="PLuserA1",
            title="A's Playlist",
            channel_title="ChanA",
            thumbnail_url="https://example.com/thumb.jpg",
        )
        self.p_b = Playlist.objects.create(
            user=self.user_b,
            youtube_playlist_id="PLuserB1",
            title="B's Playlist",
            channel_title="ChanB",
            thumbnail_url="https://example.com/thumb.jpg",
        )

    def test_detail_returns_own_playlist(self):
        response = self.client.get(
            f"/api/playlists/{self.p_a.id}/",
            HTTP_AUTHORIZATION=f"Token {self.token_a.key}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "A's Playlist")

    def test_detail_returns_404_for_other_user_playlist(self):
        response = self.client.get(
            f"/api/playlists/{self.p_b.id}/",
            HTTP_AUTHORIZATION=f"Token {self.token_a.key}",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_detail_requires_auth(self):
        response = self.client.get(f"/api/playlists/{self.p_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
