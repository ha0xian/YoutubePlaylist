from django.contrib import admin

from .models import Playlist, Video, VideoNote, YouTubeOAuthToken


@admin.register(YouTubeOAuthToken)
class YouTubeOAuthTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'token_type', 'expires_at', 'created_at']
    list_filter = ['token_type']
    search_fields = ['user__username']
    readonly_fields = ['access_token_display', 'refresh_token_display', 'created_at', 'updated_at']
    fieldsets = (
        (None, {
            'fields': ('user', 'token_type', 'expires_at'),
        }),
        ('Token Data', {
            'fields': ('access_token_display', 'refresh_token_display'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    @admin.display(description='Access Token')
    def access_token_display(self, obj):
        return '[encrypted]' if obj.access_token else '-'

    @admin.display(description='Refresh Token')
    def refresh_token_display(self, obj):
        return '[encrypted]' if obj.refresh_token else '-'


class VideoInline(admin.TabularInline):
    model = Video
    extra = 0
    fields = ['youtube_video_id', 'title', 'position', 'duration', 'is_deleted', 'is_removed']
    readonly_fields = ['youtube_video_id', 'title', 'position', 'duration']
    can_delete = False
    show_change_link = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'source_type', 'video_count', 'is_hidden', 'is_unlinked', 'is_deleted', 'created_at']
    list_filter = ['source_type', 'is_hidden', 'is_unlinked', 'is_deleted']
    search_fields = ['title', 'channel_title', 'user__username']
    inlines = [VideoInline]


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'playlist', 'position', 'duration', 'is_deleted', 'is_removed']
    list_filter = ['is_deleted', 'is_removed']
    search_fields = ['title', 'youtube_video_id', 'playlist__title']
    readonly_fields = ['youtube_video_id', 'title', 'channel_title', 'duration', 'thumbnail_url',
                       'published_at', 'view_count', 'position']


@admin.register(VideoNote)
class VideoNoteAdmin(admin.ModelAdmin):
    list_display = ['video', 'user', 'updated_at']
    search_fields = ['user__username', 'video__title']
