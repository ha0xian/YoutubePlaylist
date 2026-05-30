from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_root, name="api-root"),
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
]
