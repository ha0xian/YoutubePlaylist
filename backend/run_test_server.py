"""
Test server wrapper: adds missing auth endpoints required by the frontend.
This is a temporary test harness, not production code.
"""
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()  # Must call before importing models

from django.conf import settings
from django.urls import include, path
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status

# ---- Auth Views ----
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": {"id": user.id, "username": user.username, "email": user.email}
        })
    return Response({"detail": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_register(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")
    email = request.data.get("email", "")
    if User.objects.filter(username=username).exists():
        return Response({"username": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=username, password=password, email=email)
    token = Token.objects.create(user=user)
    return Response({
        "token": token.key,
        "user": {"id": user.id, "username": user.username, "email": user.email}
    }, status=status.HTTP_201_CREATED)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_me(request):
    user = request.user
    return Response({"id": user.id, "username": user.username, "email": user.email})

# Add auth URL patterns to the root URLconf
from config.urls import urlpatterns as base_patterns

auth_urls = [
    path("auth/login/", auth_login, name="auth-login"),
    path("auth/register/", auth_register, name="auth-register"),
    path("auth/me/", auth_me, name="auth-me"),
]

for i, p in enumerate(base_patterns):
    if hasattr(p, 'pattern') and str(p.pattern) == 'api/':
        base_patterns.insert(i, path("api/", include(auth_urls)))
        break

# Now start the server
from django.core.management import execute_from_command_line
execute_from_command_line(sys.argv)
