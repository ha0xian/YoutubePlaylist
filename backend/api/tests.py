from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

User = get_user_model()

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
ME_URL = "/api/auth/me/"

VALID_USERNAME = "testuser"
VALID_EMAIL = "test@example.com"
VALID_PASSWORD = "StrongPass123!"


class TestRegister(APITestCase):
    def test_register_with_valid_data_returns_201_with_token_and_user(self):
        data = {
            "username": VALID_USERNAME,
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        }
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)

        user_data = response.data["user"]
        self.assertIn("id", user_data)
        self.assertIn("uuid", user_data)
        self.assertIn("username", user_data)
        self.assertIn("email", user_data)
        self.assertEqual(user_data["username"], VALID_USERNAME)
        self.assertEqual(user_data["email"], VALID_EMAIL)

    def test_register_duplicate_username_returns_400(self):
        User.objects.create_user(
            username=VALID_USERNAME,
            email="other@example.com",
            password=VALID_PASSWORD,
        )
        data = {
            "username": VALID_USERNAME,
            "email": "unique@example.com",
            "password": VALID_PASSWORD,
        }
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_duplicate_email_returns_400(self):
        User.objects.create_user(
            username="otheruser",
            email=VALID_EMAIL,
            password=VALID_PASSWORD,
        )
        data = {
            "username": "newuser",
            "email": VALID_EMAIL,
            "password": VALID_PASSWORD,
        }
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_weak_password_returns_400(self):
        data = {
            "username": VALID_USERNAME,
            "email": VALID_EMAIL,
            "password": "123",
        }
        response = self.client.post(REGISTER_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)


class TestLogin(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username=VALID_USERNAME,
            email=VALID_EMAIL,
            password=VALID_PASSWORD,
        )

    def test_login_with_correct_username_and_password_returns_200(self):
        data = {"username": VALID_USERNAME, "password": VALID_PASSWORD}
        response = self.client.post(LOGIN_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], VALID_USERNAME)

    def test_login_with_correct_email_and_password_returns_200(self):
        data = {"email": VALID_EMAIL, "password": VALID_PASSWORD}
        response = self.client.post(LOGIN_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], VALID_USERNAME)

    def test_login_with_wrong_password_returns_401(self):
        data = {
            "username": VALID_USERNAME,
            "password": "WrongPassword!",
        }
        response = self.client.post(LOGIN_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "Unable to log in with provided credentials.",
        )

    def test_login_with_nonexistent_username_returns_401(self):
        data = {
            "username": "nonexistent",
            "password": VALID_PASSWORD,
        }
        response = self.client.post(LOGIN_URL, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"],
            "Unable to log in with provided credentials.",
        )


class TestMe(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username=VALID_USERNAME,
            email=VALID_EMAIL,
            password=VALID_PASSWORD,
        )
        self.token = Token.objects.create(user=self.user)

    def test_get_me_with_valid_token_returns_200(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertIn("uuid", response.data)
        self.assertIn("username", response.data)
        self.assertIn("email", response.data)
        self.assertEqual(response.data["username"], VALID_USERNAME)
        self.assertEqual(response.data["email"], VALID_EMAIL)

    def test_get_me_without_token_returns_401(self):
        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_me_with_invalid_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Token invalidtoken123")
        response = self.client.get(ME_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
