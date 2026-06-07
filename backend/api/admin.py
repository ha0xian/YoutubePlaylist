from django.contrib import admin

from .models import YouTubeOAuthToken


@admin.register(YouTubeOAuthToken)
class YouTubeOAuthTokenAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "token_type",
        "expires_at",
        "youtube_channel_title",
        "created_at",
    )
    # Exclude encrypted token fields from all admin views so decrypted
    # values are never displayed.
    exclude = ("encrypted_access_token", "encrypted_refresh_token")
