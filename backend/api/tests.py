import json
from unittest.mock import MagicMock, Mock, patch

from django.contrib.auth.models import User
from django.test import override_settings
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

    @patch("api.youtube._fetch_video_details")
    @patch("api.youtube._fetch_playlist_items")
    @patch("api.youtube._fetch_playlist_snippet")
    def test_reimport_marks_missing_videos_removed(self, mock_snippet, mock_items, mock_videos):
        """Videos missing from reimport are marked is_removed=True, not deleted."""
        mock_snippet.return_value = _playlist_snippet()
        mock_items.return_value = _playlist_items()
        mock_videos.return_value = _video_details(["vid00000001", "vid00000002"])

        # First import — 2 videos
        response1 = self._post_import()
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response1.data["videos"]), 2)

        # Reimport with only 1 video (vid00000001 missing)
        mock_items.return_value = [
            {
                "snippet": {
                    "title": "Video Two",
                    "channelTitle": "Test Channel",
                    "position": 0,
                    "resourceId": {"videoId": "vid00000002"},
                    "publishedAt": "2026-01-12T10:00:00Z",
                    "thumbnails": {
                        "default": {
                            "url": "https://i.ytimg.com/vi/vid00000002/default.jpg"
                        }
                    },
                },
            },
        ]
        mock_snippet.return_value = _playlist_snippet()
        mock_videos.return_value = _video_details(["vid00000002"])

        response2 = self._post_import()
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Both videos still in DB
        from .models import Video

        playlist_id = response2.data["id"]
        videos = Video.objects.filter(playlist_id=playlist_id)
        self.assertEqual(videos.count(), 2)

        vid1 = videos.get(youtube_video_id="vid00000001")
        self.assertTrue(vid1.is_removed)

        vid2 = videos.get(youtube_video_id="vid00000002")
        self.assertFalse(vid2.is_removed)

    @patch("api.youtube._fetch_video_details")
    @patch("api.youtube._fetch_playlist_items")
    @patch("api.youtube._fetch_playlist_snippet")
    def test_reimport_revives_removed_video(self, mock_snippet, mock_items, mock_videos):
        """A previously removed video is revived when it reappears in a reimport."""
        mock_snippet.return_value = _playlist_snippet()
        mock_items.return_value = _playlist_items()
        mock_videos.return_value = _video_details(["vid00000001", "vid00000002"])

        # First import — 2 videos
        response1 = self._post_import()
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Reimport with only 1 video — marks vid00000001 removed
        mock_items.return_value = [
            {
                "snippet": {
                    "title": "Video Two",
                    "channelTitle": "Test Channel",
                    "position": 0,
                    "resourceId": {"videoId": "vid00000002"},
                    "publishedAt": "2026-01-12T10:00:00Z",
                    "thumbnails": {
                        "default": {
                            "url": "https://i.ytimg.com/vi/vid00000002/default.jpg"
                        }
                    },
                },
            },
        ]
        mock_videos.return_value = _video_details(["vid00000002"])
        response2 = self._post_import()
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        from .models import Video

        playlist_id = response2.data["id"]
        vid1 = Video.objects.get(playlist_id=playlist_id, youtube_video_id="vid00000001")
        self.assertTrue(vid1.is_removed)

        # Third reimport includes vid00000001 again — it should revive
        mock_items.return_value = _playlist_items()
        mock_videos.return_value = _video_details(["vid00000001", "vid00000002"])
        response3 = self._post_import()
        self.assertEqual(response3.status_code, status.HTTP_200_OK)

        vid1.refresh_from_db()
        self.assertFalse(vid1.is_removed)
        vid2 = Video.objects.get(playlist_id=playlist_id, youtube_video_id="vid00000002")
        self.assertFalse(vid2.is_removed)


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

    def test_detail_includes_is_removed_for_videos(self):
        """Nested videos include is_removed with the database value."""
        from .models import Video

        Video.objects.create(
            playlist=self.p_a,
            youtube_video_id="vid-active",
            position=0,
            title="Active Video",
            channel_title="ChanA",
            duration="3:00",
            thumbnail_url="https://example.com/active.jpg",
            is_removed=False,
        )
        Video.objects.create(
            playlist=self.p_a,
            youtube_video_id="vid-removed",
            position=1,
            title="Removed Video",
            channel_title="ChanA",
            duration="5:00",
            thumbnail_url="https://example.com/removed.jpg",
            is_removed=True,
        )

        response = self.client.get(
            f"/api/playlists/{self.p_a.id}/",
            HTTP_AUTHORIZATION=f"Token {self.token_a.key}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["videos"]), 2)

        active = next(v for v in response.data["videos"] if v["youtube_video_id"] == "vid-active")
        removed = next(v for v in response.data["videos"] if v["youtube_video_id"] == "vid-removed")
        self.assertFalse(active["is_removed"])
        self.assertTrue(removed["is_removed"])

    def test_detail_requires_auth(self):
        response = self.client.get(f"/api/playlists/{self.p_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class NoteDetailTests(APITestCase):
    def setUp(self):
        self.video_id = "vid00000001"
        self.note_url = f"/api/notes/{self.video_id}/"
        self.user_a = User.objects.create_user(
            username="noteA", password="AStrongP4ssword!"
        )
        self.user_b = User.objects.create_user(
            username="noteB", password="AStrongP4ssword!"
        )
        self.token_a = Token.objects.create(user=self.user_a)
        self.token_b = Token.objects.create(user=self.user_b)

    def _auth_header(self, token=None):
        return {"HTTP_AUTHORIZATION": f"Token {(token or self.token_a).key}"}

    def test_note_requires_auth(self):
        get_response = self.client.get(self.note_url)
        put_response = self.client.put(
            self.note_url,
            {"content": "hello"},
            format="json",
        )

        self.assertEqual(get_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(put_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_missing_note_returns_empty_shape(self):
        response = self.client.get(self.note_url, **self._auth_header())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["id"])
        self.assertEqual(response.data["youtube_video_id"], self.video_id)
        self.assertEqual(response.data["content"], "")
        self.assertIsNone(response.data["created_at"])
        self.assertIsNone(response.data["updated_at"])

    def test_put_creates_note(self):
        response = self.client.put(
            self.note_url,
            {"content": "hello"},
            format="json",
            **self._auth_header(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["youtube_video_id"], self.video_id)
        self.assertEqual(response.data["content"], "hello")

        from .models import Note

        note = Note.objects.get(user=self.user_a, youtube_video_id=self.video_id)
        self.assertEqual(note.content, "hello")

    def test_put_updates_existing_note_without_duplicate(self):
        first = self.client.put(
            self.note_url,
            {"content": "first"},
            format="json",
            **self._auth_header(),
        )
        second = self.client.put(
            self.note_url,
            {"content": "second"},
            format="json",
            **self._auth_header(),
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["content"], "second")

        from .models import Note

        notes = Note.objects.filter(user=self.user_a, youtube_video_id=self.video_id)
        self.assertEqual(notes.count(), 1)
        self.assertEqual(notes.get().content, "second")

    def test_blank_content_is_allowed(self):
        response = self.client.put(
            self.note_url,
            {"content": ""},
            format="json",
            **self._auth_header(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "")

    def test_missing_content_is_rejected(self):
        response = self.client.put(
            self.note_url,
            {},
            format="json",
            **self._auth_header(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data)

    def test_notes_are_scoped_per_user(self):
        response_a = self.client.put(
            self.note_url,
            {"content": "user A note"},
            format="json",
            **self._auth_header(self.token_a),
        )
        response_b = self.client.put(
            self.note_url,
            {"content": "user B note"},
            format="json",
            **self._auth_header(self.token_b),
        )
        get_a = self.client.get(self.note_url, **self._auth_header(self.token_a))
        get_b = self.client.get(self.note_url, **self._auth_header(self.token_b))

        self.assertEqual(response_a.status_code, status.HTTP_200_OK)
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)
        self.assertEqual(get_a.data["content"], "user A note")
        self.assertEqual(get_b.data["content"], "user B note")

        from .models import Note

        self.assertEqual(Note.objects.filter(youtube_video_id=self.video_id).count(), 2)


# ── YouTube OAuth tests ────────────────────────────────────────────────────

# A valid Fernet key for tests (pre-generated, not used in production)
_TEST_ENCRYPTION_KEY = "6X2uTbO1GqRm8vJwK3pDcFxA5hN4sYkL7zU9aB0eC1I="


# ── Encryption unit-style tests ─────────────────────────────────────────────


class EncryptionTests(APITestCase):
    """Unit-style tests for the token encryption utility."""

    def test_round_trip_with_valid_key(self):
        from .encryption import encrypt_token, decrypt_token

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=_TEST_ENCRYPTION_KEY):
            plaintext = "ya29.a0AfH6SMB-test-access-token"
            ciphertext = encrypt_token(plaintext)
            self.assertNotEqual(ciphertext, plaintext)
            self.assertNotIn(plaintext, ciphertext)
            self.assertEqual(decrypt_token(ciphertext), plaintext)

    def test_empty_plaintext_preserved(self):
        from .encryption import encrypt_token, decrypt_token

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=_TEST_ENCRYPTION_KEY):
            self.assertEqual(encrypt_token(""), "")
            self.assertEqual(decrypt_token(""), "")

    def test_missing_key_raises_error(self):
        from .encryption import (
            TokenEncryptionError,
            encrypt_token,
            decrypt_token,
            is_token_encryption_configured,
        )

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=""):
            self.assertFalse(is_token_encryption_configured())
            with self.assertRaises(TokenEncryptionError):
                encrypt_token("some-value")
            with self.assertRaises(TokenEncryptionError):
                decrypt_token("some-value")

    def test_invalid_key_raises_error(self):
        from .encryption import (
            TokenEncryptionError,
            encrypt_token,
            is_token_encryption_configured,
        )

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY="not-a-valid-fernet-key"):
            self.assertFalse(is_token_encryption_configured())
            with self.assertRaises(TokenEncryptionError):
                encrypt_token("some-value")

    def test_decrypt_corrupt_value_raises_error(self):
        from .encryption import encrypt_token, decrypt_token, TokenEncryptionError

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=_TEST_ENCRYPTION_KEY):
            with self.assertRaises(TokenEncryptionError):
                decrypt_token("not-a-valid-fernet-token-string!!")


# ── Helper factories for OAuth tests ───────────────────────────────────────


def _google_token_payload(access_token="ya29.test-access-token"):
    return {
        "access_token": access_token,
        "expires_in": 3599,
        "scope": "https://www.googleapis.com/auth/youtube.readonly",
        "token_type": "Bearer",
        "refresh_token": "1//test-refresh-token",
    }


def _channel_snippet():
    return {
        "id": "UCtestchannel123",
        "snippet": {
            "title": "Test YouTube Channel",
            "description": "A test channel.",
        },
    }


def _oauth_playlist_snippet(playlist_id="PLoauth1", title="OAuth Playlist"):
    return {
        "id": playlist_id,
        "snippet": {
            "title": title,
            "channelTitle": "Test YouTube Channel",
            "description": "An OAuth-imported playlist.",
            "publishedAt": "2026-01-15T12:00:00Z",
            "thumbnails": {
                "medium": {"url": f"https://i.ytimg.com/vi/oauth/default.jpg"}
            },
        },
        "contentDetails": {"itemCount": 1},
    }


def _oauth_playlist_items(playlist_id="PLoauth1"):
    return [
        {
            "snippet": {
                "title": "OAuth Video",
                "channelTitle": "Test YouTube Channel",
                "position": 0,
                "resourceId": {"videoId": "vid-oauth-1"},
                "publishedAt": "2026-01-10T10:00:00Z",
                "thumbnails": {
                    "default": {
                        "url": "https://i.ytimg.com/vi/vid-oauth-1/default.jpg"
                    }
                },
            },
        },
    ]


def _oauth_video_details(video_ids):
    details = {}
    for vid in video_ids:
        details[vid] = {
            "id": vid,
            "snippet": {
                "title": f"Video {vid}",
                "channelTitle": "Test YouTube Channel",
                "publishedAt": "2026-01-10T10:00:00Z",
                "thumbnails": {
                    "default": {
                        "url": f"https://i.ytimg.com/vi/{vid}/default.jpg"
                    }
                },
            },
            "contentDetails": {"duration": "PT3M45S"},
            "statistics": {"viewCount": "500"},
        }
    return details


# ── OAuth endpoint integration tests ───────────────────────────────────────


class YouTubeOAuthAuthUrlTests(APITestCase):
    """Tests for GET /api/youtube/auth-url/"""

    def setUp(self):
        self.auth_url_path = "/api/youtube/auth-url/"
        self.user = User.objects.create_user(
            username="oauthuser", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)
        self.oauth_settings = {
            "YOUTUBE_OAUTH_CLIENT_ID": "test-client-id.apps.googleusercontent.com",
            "YOUTUBE_OAUTH_CLIENT_SECRET": "test-client-secret",
            "YOUTUBE_OAUTH_REDIRECT_URI": "http://localhost:5173/",
            "YOUTUBE_TOKEN_ENCRYPTION_KEY": _TEST_ENCRYPTION_KEY,
        }

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_auth_url_requires_auth(self):
        response = self.client.get(self.auth_url_path)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_url_returns_url_and_state(self):
        with override_settings(**self.oauth_settings):
            response = self.client.get(
                self.auth_url_path, **self._auth_header()
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("auth_url", response.data)
        self.assertIn("state", response.data)
        self.assertTrue(
            response.data["auth_url"].startswith(
                "https://accounts.google.com/o/oauth2/v2/auth?"
            )
        )

    def test_auth_url_contains_expected_oauth_params(self):
        with override_settings(**self.oauth_settings):
            response = self.client.get(
                self.auth_url_path, **self._auth_header()
            )
        url = response.data["auth_url"]
        self.assertIn("client_id=test-client-id.apps.googleusercontent.com", url)
        self.assertIn("response_type=code", url)
        self.assertIn("access_type=offline", url)
        self.assertIn("prompt=consent", url)
        self.assertIn("scope=", url)
        self.assertIn("state=", url)

    def test_auth_url_does_not_expose_client_secret(self):
        with override_settings(**self.oauth_settings):
            response = self.client.get(
                self.auth_url_path, **self._auth_header()
            )
        self.assertNotIn("test-client-secret", response.data["auth_url"])

    def test_auth_url_returns_400_when_not_configured(self):
        """Missing OAuth settings should return 400."""
        with override_settings(
            YOUTUBE_OAUTH_CLIENT_ID="",
            YOUTUBE_OAUTH_CLIENT_SECRET="",
            YOUTUBE_OAUTH_REDIRECT_URI="",
            YOUTUBE_TOKEN_ENCRYPTION_KEY="",
        ):
            response = self.client.get(
                self.auth_url_path, **self._auth_header()
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class YouTubeOAuthCallbackAuthTests(APITestCase):
    """Auth and validation tests for POST /api/youtube/callback/"""

    def setUp(self):
        self.callback_url = "/api/youtube/callback/"
        self.user = User.objects.create_user(
            username="oauthuser", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)
        self.oauth_settings = {
            "YOUTUBE_OAUTH_CLIENT_ID": "test-client-id.apps.googleusercontent.com",
            "YOUTUBE_OAUTH_CLIENT_SECRET": "test-client-secret",
            "YOUTUBE_OAUTH_REDIRECT_URI": "http://localhost:5173/",
            "YOUTUBE_TOKEN_ENCRYPTION_KEY": _TEST_ENCRYPTION_KEY,
        }

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def _signed_state(self, user_id=1):
        from .youtube_oauth import _sign_state
        return _sign_state(user_id)

    def test_callback_requires_auth(self):
        response = self.client.post(
            self.callback_url,
            {"code": "test-code", "state": "test-state"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_callback_rejects_missing_code(self):
        state = self._signed_state(self.user.id)
        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.callback_url,
                {"state": state},
                format="json",
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", response.data["detail"].lower())

    def test_callback_rejects_missing_state(self):
        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.callback_url,
                {"code": "test-code"},
                format="json",
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("state", response.data["detail"].lower())

    def test_callback_rejects_invalid_state(self):
        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.callback_url,
                {"code": "test-code", "state": "not-a-valid-signed-state"},
                format="json",
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_callback_rejects_wrong_user_state(self):
        """State signed for user 2 should be rejected when user 1 posts it."""
        state = self._signed_state(user_id=9999)
        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.callback_url,
                {"code": "test-code", "state": state},
                format="json",
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not match", response.data["detail"].lower())

    def test_callback_rejects_empty_state(self):
        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.callback_url,
                {"code": "test-code", "state": ""},
                format="json",
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class YouTubeOAuthCallbackSuccessTests(APITestCase):
    """Happy-path callback tests with mocked external services."""

    def setUp(self):
        self.callback_url = "/api/youtube/callback/"
        self.user = User.objects.create_user(
            username="oauthuser", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)
        self.oauth_settings = {
            "YOUTUBE_OAUTH_CLIENT_ID": "test-client-id.apps.googleusercontent.com",
            "YOUTUBE_OAUTH_CLIENT_SECRET": "test-client-secret",
            "YOUTUBE_OAUTH_REDIRECT_URI": "http://localhost:5173/",
            "YOUTUBE_TOKEN_ENCRYPTION_KEY": _TEST_ENCRYPTION_KEY,
        }

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def _signed_state(self):
        from .youtube_oauth import _sign_state
        return _sign_state(self.user.id)

    def _mock_google_post(self, url, data, timeout=30):
        """Simulate a successful token exchange."""
        mock_resp = Mock()
        mock_resp.ok = True
        mock_resp.json.return_value = _google_token_payload()
        return mock_resp

    def test_successful_callback_connects_and_stores_token_without_import(self):
        """End-to-end callback stores tokens but does not import playlists."""
        state = self._signed_state()

        with override_settings(**self.oauth_settings):
            mock_session = MagicMock()

            # Token exchange
            mock_session.post.return_value = Mock(
                ok=True,
                json=Mock(return_value=_google_token_payload()),
            )

            def _get_side_effect(url, params=None, headers=None, timeout=30):
                mock = Mock(ok=True)
                if "channels" in url:
                    mock.json.return_value = {"items": [_channel_snippet()]}
                else:
                    mock.json.return_value = {"items": []}
                return mock

            mock_session.get.side_effect = _get_side_effect

            from . import youtube_oauth as oauth_mod

            with patch.object(
                oauth_mod, "requests", mock_session
            ):
                response = self.client.post(
                    self.callback_url,
                    {"code": "valid-auth-code", "state": state},
                    format="json",
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["connected"])
        self.assertEqual(response.data["imported_playlist_count"], 0)
        self.assertEqual(response.data["channel_id"], "UCtestchannel123")
        self.assertEqual(response.data["channel_title"], "Test YouTube Channel")

        # Verify token is stored encrypted
        from .models import YouTubeOAuthToken

        token_row = YouTubeOAuthToken.objects.get(user=self.user)
        self.assertNotEqual(
            token_row.encrypted_access_token, "ya29.test-access-token"
        )
        self.assertNotIn("ya29", token_row.encrypted_access_token)

        from .models import Playlist, Video

        self.assertEqual(Playlist.objects.filter(user=self.user).count(), 0)
        self.assertEqual(Video.objects.count(), 0)

    def test_callback_does_not_update_existing_playlist_on_overlap(self):
        """OAuth callback connects only; selected import handles playlists."""
        from .models import Playlist

        # Pre-create a URL-imported playlist
        url_playlist = Playlist.objects.create(
            user=self.user,
            youtube_playlist_id="PLoauth1",
            title="URL Playlist",
            channel_title="URL Channel",
            thumbnail_url="https://example.com/thumb.jpg",
            source="url",
        )

        state = self._signed_state()

        with override_settings(**self.oauth_settings):
            mock_session = MagicMock()
            mock_session.post.return_value = Mock(
                ok=True,
                json=Mock(return_value=_google_token_payload()),
            )

            def _get_side_effect(url, params=None, headers=None, timeout=30):
                mock = Mock(ok=True)
                if "channels" in url:
                    mock.json.return_value = {"items": [_channel_snippet()]}
                else:
                    mock.json.return_value = {"items": []}
                return mock

            mock_session.get.side_effect = _get_side_effect

            from . import youtube_oauth as oauth_mod

            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.post(
                    self.callback_url,
                    {"code": "valid-auth-code", "state": state},
                    format="json",
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        url_playlist.refresh_from_db()
        self.assertEqual(url_playlist.source, "url")
        self.assertEqual(url_playlist.channel_title, "URL Channel")

    def test_callback_handles_google_account_without_youtube_channel(self):
        """Google accounts without a YouTube channel connect but import zero playlists."""
        state = self._signed_state()

        with override_settings(**self.oauth_settings):
            mock_session = MagicMock()
            mock_session.post.return_value = Mock(
                ok=True,
                json=Mock(return_value=_google_token_payload()),
            )

            def _get_side_effect(url, params=None, headers=None, timeout=30):
                if "channels" in url:
                    mock = Mock(ok=True)
                    mock.json.return_value = {"items": []}
                    return mock

                if "playlists" in url:
                    mock = Mock(ok=False)
                    mock.status_code = 404
                    mock.text = '{"error":{"message":"Channel not found."}}'
                    mock.json.return_value = {
                        "error": {
                            "code": 404,
                            "message": "Channel not found.",
                            "errors": [
                                {
                                    "message": "Channel not found.",
                                    "domain": "youtube.playlist",
                                    "reason": "channelNotFound",
                                    "location": "channelId",
                                    "locationType": "parameter",
                                }
                            ],
                        }
                    }
                    return mock

                mock = Mock(ok=True)
                mock.json.return_value = {"items": []}
                return mock

            mock_session.get.side_effect = _get_side_effect

            from . import youtube_oauth as oauth_mod

            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.post(
                    self.callback_url,
                    {"code": "valid-auth-code", "state": state},
                    format="json",
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["connected"])
        self.assertEqual(response.data["imported_playlist_count"], 0)


class YouTubeOAuthPlaylistSelectionTests(APITestCase):
    """Tests for remote playlist listing and selected OAuth import."""

    def setUp(self):
        self.remote_url = "/api/youtube/playlists/"
        self.import_url = "/api/youtube/playlists/import/"
        self.user = User.objects.create_user(
            username="oauthuser", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)
        self.oauth_settings = {
            "YOUTUBE_TOKEN_ENCRYPTION_KEY": _TEST_ENCRYPTION_KEY,
        }

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def _connect_youtube(self, access_token="ya29.test-access-token"):
        from .encryption import encrypt_token
        from .models import YouTubeOAuthToken

        return YouTubeOAuthToken.objects.create(
            user=self.user,
            encrypted_access_token=encrypt_token(access_token),
            encrypted_refresh_token=encrypt_token("1//refresh-token"),
        )

    def _mock_youtube_get(self, url, params=None, headers=None, timeout=30):
        mock = Mock(ok=True)
        params = params or {}

        if "playlistItems" in url:
            playlist_id = params.get("playlistId", "PLoauth1")
            mock.json.return_value = {
                "items": _oauth_playlist_items(playlist_id),
            }
        elif "playlists" in url:
            if params.get("id"):
                ids = params["id"].split(",")
                mock.json.return_value = {
                    "items": [
                        _oauth_playlist_snippet(
                            playlist_id=playlist_id,
                            title=f"OAuth Playlist {playlist_id[-1]}",
                        )
                        for playlist_id in ids
                    ],
                }
            else:
                mock.json.return_value = {
                    "items": [
                        _oauth_playlist_snippet("PLoauth1", "OAuth Playlist 1"),
                        _oauth_playlist_snippet("PLoauth2", "OAuth Playlist 2"),
                    ],
                }
        elif "videos" in url:
            video_ids = params.get("id", "").split(",")
            mock.json.return_value = {
                "items": list(_oauth_video_details(video_ids).values()),
            }
        else:
            mock.json.return_value = {"items": []}

        return mock

    def test_remote_playlists_requires_auth(self):
        response = self.client.get(self.remote_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_remote_playlists_requires_connected_youtube(self):
        with override_settings(**self.oauth_settings):
            response = self.client.get(
                self.remote_url,
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not connected", response.data["detail"].lower())

    def test_remote_playlists_returns_choices_and_imported_state(self):
        from .models import Playlist

        with override_settings(**self.oauth_settings):
            self._connect_youtube()
            existing = Playlist.objects.create(
                user=self.user,
                youtube_playlist_id="PLoauth1",
                title="Existing URL",
                channel_title="Existing Channel",
                source="url",
            )

            from . import youtube_oauth as oauth_mod

            mock_session = MagicMock()
            mock_session.get.side_effect = self._mock_youtube_get
            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.get(
                    self.remote_url,
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        first = response.data[0]
        self.assertEqual(first["youtube_playlist_id"], "PLoauth1")
        self.assertTrue(first["is_imported"])
        self.assertEqual(first["local_playlist_id"], existing.id)
        self.assertEqual(first["source"], "url")
        self.assertEqual(first["video_count"], 1)

    def test_remote_playlists_handles_no_youtube_channel_as_empty_list(self):
        with override_settings(**self.oauth_settings):
            self._connect_youtube()

            mock_session = MagicMock()

            def _get_side_effect(url, params=None, headers=None, timeout=30):
                mock = Mock(ok=False)
                mock.status_code = 404
                mock.text = '{"error":{"message":"Channel not found."}}'
                mock.json.return_value = {
                    "error": {
                        "message": "Channel not found.",
                        "errors": [{"reason": "channelNotFound"}],
                    }
                }
                return mock

            mock_session.get.side_effect = _get_side_effect

            from . import youtube_oauth as oauth_mod

            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.get(
                    self.remote_url,
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_selected_import_requires_auth(self):
        response = self.client.post(
            self.import_url,
            {"playlist_ids": ["PLoauth1"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_selected_import_rejects_invalid_playlist_ids(self):
        with override_settings(**self.oauth_settings):
            self._connect_youtube()
            for payload in ({}, {"playlist_ids": "PLoauth1"}):
                response = self.client.post(
                    self.import_url,
                    payload,
                    format="json",
                    **self._auth_header(),
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_selected_import_imports_only_selected_and_preserves_sources(self):
        from .models import Playlist, Video

        with override_settings(**self.oauth_settings):
            self._connect_youtube()
            url_playlist = Playlist.objects.create(
                user=self.user,
                youtube_playlist_id="PLoauth1",
                title="URL Playlist",
                channel_title="URL Channel",
                source="url",
            )

            from . import youtube_oauth as oauth_mod

            mock_session = MagicMock()
            mock_session.get.side_effect = self._mock_youtube_get
            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.post(
                    self.import_url,
                    {"playlist_ids": ["PLoauth1", "PLoauth2"]},
                    format="json",
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["imported_playlist_count"], 2)

        url_playlist.refresh_from_db()
        self.assertEqual(url_playlist.source, "url")
        self.assertEqual(url_playlist.title, "OAuth Playlist 1")

        oauth_playlist = Playlist.objects.get(
            user=self.user,
            youtube_playlist_id="PLoauth2",
        )
        self.assertEqual(oauth_playlist.source, "oauth")
        self.assertEqual(
            Playlist.objects.filter(user=self.user, youtube_playlist_id="PLoauth3").count(),
            0,
        )
        self.assertEqual(Video.objects.filter(playlist=url_playlist).count(), 1)
        self.assertEqual(Video.objects.filter(playlist=oauth_playlist).count(), 1)

    def test_selected_import_marks_stale_videos_removed(self):
        """Existing videos for refreshed selected playlists are marked removed when missing."""
        from .models import Playlist, Video

        with override_settings(**self.oauth_settings):
            self._connect_youtube()

            # Pre-create playlist with a video that will NOT be in the mock items
            playlist = Playlist.objects.create(
                user=self.user,
                youtube_playlist_id="PLoauth1",
                title="Old Title",
                channel_title="Old Channel",
                source="oauth",
            )
            stale_video = Video.objects.create(
                playlist=playlist,
                youtube_video_id="vid-stale",
                position=0,
                title="Stale Video",
                channel_title="Old Channel",
                duration="3:00",
                thumbnail_url="https://example.com/stale.jpg",
                is_removed=False,
            )

            from . import youtube_oauth as oauth_mod

            mock_session = MagicMock()
            mock_session.get.side_effect = self._mock_youtube_get
            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.post(
                    self.import_url,
                    {"playlist_ids": ["PLoauth1"]},
                    format="json",
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        stale_video.refresh_from_db()
        self.assertTrue(stale_video.is_removed)

        # Incoming oauth video is active
        incoming = Video.objects.get(playlist=playlist, youtube_video_id="vid-oauth-1")
        self.assertFalse(incoming.is_removed)

    def test_selected_import_removes_unchecked_oauth_playlists(self):
        from .models import Playlist

        with override_settings(**self.oauth_settings):
            self._connect_youtube()
            Playlist.objects.create(
                user=self.user,
                youtube_playlist_id="PLoauth1",
                title="OAuth Playlist 1",
                channel_title="OAuth Channel",
                source="oauth",
            )
            url_playlist = Playlist.objects.create(
                user=self.user,
                youtube_playlist_id="PLoauth2",
                title="URL Playlist 2",
                channel_title="URL Channel",
                source="url",
            )

            from . import youtube_oauth as oauth_mod

            mock_session = MagicMock()
            mock_session.get.side_effect = self._mock_youtube_get
            with patch.object(oauth_mod, "requests", mock_session):
                response = self.client.post(
                    self.import_url,
                    {"playlist_ids": []},
                    format="json",
                    **self._auth_header(),
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["imported_playlist_count"], 0)
        self.assertFalse(
            Playlist.objects.filter(
                user=self.user,
                youtube_playlist_id="PLoauth1",
            ).exists()
        )
        self.assertTrue(
            Playlist.objects.filter(id=url_playlist.id, source="url").exists()
        )


class YouTubeOAuthDisconnectTests(APITestCase):
    """Tests for POST /api/youtube/disconnect/"""

    def setUp(self):
        self.disconnect_url = "/api/youtube/disconnect/"
        self.user = User.objects.create_user(
            username="oauthuser", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)
        self.oauth_settings = {
            "YOUTUBE_TOKEN_ENCRYPTION_KEY": _TEST_ENCRYPTION_KEY,
        }

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_disconnect_requires_auth(self):
        response = self.client.post(self.disconnect_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_disconnect_not_connected_returns_zero(self):
        """Disconnect when not connected returns connected=False and 0 removed."""
        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.disconnect_url,
                **self._auth_header(),
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["connected"])
        self.assertEqual(response.data["removed_playlist_count"], 0)

    def test_disconnect_removes_oauth_playlists_only(self):
        """Disconnect deletes only source='oauth' playlists."""
        from .models import Playlist, YouTubeOAuthToken
        from .encryption import encrypt_token

        # Create OAuth token
        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=_TEST_ENCRYPTION_KEY):
            encrypted_access = encrypt_token("test-access-token")
            YouTubeOAuthToken.objects.create(
                user=self.user,
                encrypted_access_token=encrypted_access,
                youtube_channel_id="UCtest",
                youtube_channel_title="Test Channel",
            )

        # Create one OAuth playlist and one URL playlist
        oauth_pl = Playlist.objects.create(
            user=self.user,
            youtube_playlist_id="PL-oauth-1",
            title="OAuth Playlist",
            channel_title="OAuth Channel",
            thumbnail_url="https://example.com/oauth.jpg",
            source="oauth",
        )
        url_pl = Playlist.objects.create(
            user=self.user,
            youtube_playlist_id="PL-url-1",
            title="URL Playlist",
            channel_title="URL Channel",
            thumbnail_url="https://example.com/url.jpg",
            source="url",
        )

        # Create a note (should not be deleted)
        from .models import Note
        note = Note.objects.create(
            user=self.user,
            youtube_video_id="some-video-id",
            content="test note",
        )

        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.disconnect_url,
                **self._auth_header(),
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["connected"])
        self.assertEqual(response.data["removed_playlist_count"], 1)

        # OAuth playlist deleted, URL playlist preserved
        self.assertFalse(
            Playlist.objects.filter(id=oauth_pl.id).exists()
        )
        self.assertTrue(
            Playlist.objects.filter(id=url_pl.id).exists()
        )

        # OAuth token deleted
        self.assertFalse(
            YouTubeOAuthToken.objects.filter(user=self.user).exists()
        )

        # Note preserved
        self.assertTrue(
            Note.objects.filter(id=note.id).exists()
        )

    def test_disconnect_does_not_affect_other_user(self):
        """User A disconnecting does nothing to User B's data."""
        from .models import Playlist, YouTubeOAuthToken
        from .encryption import encrypt_token

        user_b = User.objects.create_user(
            username="userb", password="AStrongP4ssword!"
        )
        token_b = Token.objects.create(user=user_b)

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=_TEST_ENCRYPTION_KEY):
            # Token for user A
            YouTubeOAuthToken.objects.create(
                user=self.user,
                encrypted_access_token=encrypt_token("token-a"),
            )
            # Token for user B
            YouTubeOAuthToken.objects.create(
                user=user_b,
                encrypted_access_token=encrypt_token("token-b"),
            )

        # OAuth playlist for each user
        Playlist.objects.create(
            user=self.user,
            youtube_playlist_id="PL-user-a",
            title="A OAuth",
            channel_title="ChanA",
            thumbnail_url="https://example.com/a.jpg",
            source="oauth",
        )
        Playlist.objects.create(
            user=user_b,
            youtube_playlist_id="PL-user-b",
            title="B OAuth",
            channel_title="ChanB",
            thumbnail_url="https://example.com/b.jpg",
            source="oauth",
        )

        with override_settings(**self.oauth_settings):
            response = self.client.post(
                self.disconnect_url,
                **self._auth_header(),
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["removed_playlist_count"], 1)

        # User B's token and playlist are untouched
        self.assertTrue(
            YouTubeOAuthToken.objects.filter(user=user_b).exists()
        )
        self.assertTrue(
            Playlist.objects.filter(user=user_b, source="oauth").exists()
        )

        # User A's token is gone
        self.assertFalse(
            YouTubeOAuthToken.objects.filter(user=self.user).exists()
        )


class YouTubeOAuthStatusTests(APITestCase):
    """Tests for GET /api/youtube/status/"""

    def setUp(self):
        self.status_url = "/api/youtube/status/"
        self.user = User.objects.create_user(
            username="oauthuser", password="AStrongP4ssword!"
        )
        self.token = Token.objects.create(user=self.user)
        self.oauth_settings = {
            "YOUTUBE_TOKEN_ENCRYPTION_KEY": _TEST_ENCRYPTION_KEY,
        }

    def _auth_header(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_status_requires_auth(self):
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_status_returns_not_connected(self):
        with override_settings(**self.oauth_settings):
            response = self.client.get(
                self.status_url, **self._auth_header()
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["connected"])
        self.assertIsNone(response.data["channel_id"])
        self.assertIsNone(response.data["channel_title"])

    def test_status_returns_connected(self):
        from .models import YouTubeOAuthToken
        from .encryption import encrypt_token

        with override_settings(YOUTUBE_TOKEN_ENCRYPTION_KEY=_TEST_ENCRYPTION_KEY):
            YouTubeOAuthToken.objects.create(
                user=self.user,
                encrypted_access_token=encrypt_token("test-token"),
                youtube_channel_id="UC123",
                youtube_channel_title="My Channel",
            )

            response = self.client.get(
                self.status_url, **self._auth_header()
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["connected"])
        self.assertEqual(response.data["channel_id"], "UC123")
        self.assertEqual(response.data["channel_title"], "My Channel")
