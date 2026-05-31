from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from .models import Playlist, SourceType, Video

User = get_user_model()

def _tk(username="testuser", password="StrongPass123!"):
    u = User.objects.create_user(username=username, email=f"{username}@ex.com", password=password)
    return u, Token.objects.create(user=u).key

class TestPlaylistModel(APITestCase):
    def test_relationship(self):
        u = User.objects.create_user(username="p", email="p@ex.com", password="P!")
        p = Playlist.objects.create(user=u, youtube_playlist_id="P1", title="T", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.OAUTH)
        v = Video.objects.create(playlist=p, youtube_video_id="v1", title="V", channel_title="C", duration="PT1M", thumbnail_url="https://ex.com/v.jpg", position=0)
        self.assertEqual(p.videos.count(), 1)
        self.assertEqual(v.playlist, p)
    def test_unique(self):
        u = User.objects.create_user(username="ut", email="ut@ex.com", password="P!")
        Playlist.objects.create(user=u, youtube_playlist_id="P1", title="T", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
        with self.assertRaises(Exception):
            Playlist.objects.create(user=u, youtube_playlist_id="P1", title="T2", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
    def test_flags(self):
        u = User.objects.create_user(username="f", email="f@ex.com", password="P!")
        p = Playlist.objects.create(user=u, youtube_playlist_id="P1", title="T", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
        v = Video.objects.create(playlist=p, youtube_video_id="v1", title="V", channel_title="C", duration="PT1M", thumbnail_url="https://ex.com/v.jpg", position=0)
        self.assertFalse(p.is_hidden)
        self.assertFalse(p.is_unlinked)
        self.assertFalse(v.is_deleted)

class TestEncryption(APITestCase):
    def test_round_trip(self):
        from .encryption import decrypt_token, encrypt_token
        self.assertEqual(decrypt_token(encrypt_token("s")), "s")

class TestFormat(APITestCase):
    def test(self):
        from .youtube_service import format_duration
        for inp, exp in [("PT1H2M3S","1:02:03"),("PT5M30S","5:30"),("PT45S","0:45"),("","0:00")]:
            self.assertEqual(format_duration(inp), exp)

@override_settings(GOOGLE_OAUTH_CLIENT_ID="cid", GOOGLE_OAUTH_REDIRECT_URI="http://localhost:8000/api/youtube/callback/")
class TestOAuthInitiate(APITestCase):
    def test_url(self):
        _, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        r = self.client.get("/api/youtube/auth-url/")
        self.assertEqual(r.status_code, 200)
    def test_auth(self):
        self.assertIn(self.client.get("/api/youtube/auth-url/").status_code, [401, 403])

@override_settings(GOOGLE_OAUTH_REDIRECT_URI="http://localhost:8000/api/youtube/callback/")
class TestOAuthCallback(APITestCase):
    @patch("api.encryption.encrypt_token", return_value=b"e")
    @patch("api.views.youtube_service.fetch_playlists", return_value=[])
    @patch("api.views.youtube_service.exchange_oauth_code", return_value={"access_token":"a","expires_in":3600,"token_type":"Bearer"})
    def test_valid(self, *m):
        _, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        self.assertEqual(self.client.post("/api/youtube/callback/",{"code":"c"},format="json").status_code, 201)

class TestPlaylistList(APITestCase):
    def test_empty(self):
        _, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        self.assertEqual(self.client.get("/api/playlists/").status_code, 200)
    def test_visible(self):
        u, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        Playlist.objects.create(user=u, youtube_playlist_id="P1", title="V", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
        self.assertEqual(len(self.client.get("/api/playlists/").data), 1)

class TestHidePlaylist(APITestCase):
    def test_hide(self):
        u, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        p = Playlist.objects.create(user=u, youtube_playlist_id="P1", title="T", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
        r = self.client.post(f"/api/playlists/{p.pk}/hide/")
        self.assertEqual(r.status_code, 200)
        p.refresh_from_db()
        self.assertTrue(p.is_hidden)
    def test_hide_other_404(self):
        u1, _ = _tk("u1")
        u2, tk2 = _tk("u2")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk2}")
        p = Playlist.objects.create(user=u1, youtube_playlist_id="P1", title="T", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
        self.assertEqual(self.client.post(f"/api/playlists/{p.pk}/hide/").status_code, 404)

class TestUnhidePlaylist(APITestCase):
    def test_unhide(self):
        u, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        p = Playlist.objects.create(user=u, youtube_playlist_id="P_U", title="H", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL, is_hidden=True)
        r = self.client.post(f"/api/playlists/{p.pk}/unhide/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["is_hidden"])
        p.refresh_from_db()
        self.assertFalse(p.is_hidden)
    def test_appears_in_main_list(self):
        u, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        p = Playlist.objects.create(user=u, youtube_playlist_id="P_R", title="R", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL, is_hidden=True)
        self.client.post(f"/api/playlists/{p.pk}/unhide/")
        self.assertEqual(len(self.client.get("/api/playlists/").data), 1)
    def test_other_404(self):
        u1, _ = _tk("u1")
        u2, tk2 = _tk("u2")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk2}")
        p = Playlist.objects.create(user=u1, youtube_playlist_id="P_O", title="O", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL, is_hidden=True)
        self.assertEqual(self.client.post(f"/api/playlists/{p.pk}/unhide/").status_code, 404)

class TestVideoNote(APITestCase):
    def _v(self, u):
        p = Playlist.objects.create(user=u, youtube_playlist_id="PN", title="N", channel_title="C", thumbnail_url="https://ex.com/t.jpg", source_type=SourceType.URL)
        return Video.objects.create(playlist=p, youtube_video_id="v1", title="V", channel_title="C", duration="PT1M", thumbnail_url="https://ex.com/v.jpg", position=0)
    def test_get_empty(self):
        u, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        self.assertEqual(self.client.get(f"/api/notes/{self._v(u).pk}/").status_code, 200)
    def test_put(self):
        u, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        r = self.client.put(f"/api/notes/{self._v(u).pk}/", {"body_markdown":"n"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["body_markdown"], "n")
    def test_get_404(self):
        _, tk = _tk()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {tk}")
        self.assertEqual(self.client.get("/api/notes/99999/").status_code, 404)
