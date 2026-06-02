from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


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
