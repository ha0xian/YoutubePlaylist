# YouTube API Integration Spec

## Summary

Introduce YouTube API integration that lets authenticated app users import playlists by linking their YouTube account through OAuth or by pasting a public YouTube playlist URL. YouTube linking is optional and separate from app login.

Imported playlists and videos are stored in the product database. Normal browsing and playback screens read cached playlist/video data from the database instead of making live YouTube API calls. Per-video notes are also stored in the database and scoped per user.

## Decisions

1. **Data model**: Cache playlist metadata and the full video list with thumbnails upfront.
2. **Notes**: Notes are per user and per video, rendered with `marked`, and persisted in the database.
3. **Markdown editing**: Markdown preview applies when the user presses Enter, similar to Obsidian-style editing. For example, starting a line with `#` turns that line into a heading after Enter.
4. **Mock data**: Mock playlist/video fallback and transition data is out of scope and should be removed from the product requirements.
5. **OAuth flow**: YouTube OAuth is optional and separate from app authentication.
6. **Playlist URL import**: Public YouTube playlist URLs can be imported without linking a YouTube account.
7. **Playlist granularity**: On link/import, import all videos and save the full playlist for that user.
8. **Hidden playlists**: Users can hide playlists from the main playlist view, see hidden playlists on a separate hidden playlists page, and restore/unhide them.
9. **Unlink semantics**: Unlinking dissociates cached data but does not delete it.
10. **Disconnect semantics**: Disconnecting YouTube removes OAuth-linked playlists from the user view, but URL-linked playlists are preserved.
11. **Removed videos**: Videos removed from the source YouTube playlist remain in the product playlist and use the user-facing `removed` tag.
12. **Sync behavior**: No live sync on page load. Manual refresh is future-only and not part of the initial release.
13. **Theme**: The UI supports both dark and light themes through a UI toggle. The preference persists in the browser.
14. **Video loading**: Videos can load from `localStorage` in addition to route parameters.
15. **Future features retained**: AI/Gemini-powered analysis/chat and search/filter polish remain broader future plans.

## Remaining Configuration

- OAuth redirect URI values per deployment environment.
