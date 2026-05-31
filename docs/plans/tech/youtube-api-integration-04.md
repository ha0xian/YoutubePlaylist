---
feature: youtube-api-integration
slice: 04
area: frontend
mode: extend
parallel-safe-with: [youtube-api-integration-01, youtube-api-integration-02]
---

# Frontend UI: YouTube link flow, playlist management, notes, and removed-video indicators

## Goal

Update PlaylistBrowser to show real playlists from the backend, add a YouTube OAuth sign-in button and playlist URL input, add hide/unhide/unlink/disconnect controls, add a hidden playlists page, persist per-user video notes in the database, add a browser-persisted theme toggle, and visually mark removed videos in PlaylistDetail and WatchPage.

## Files

- `frontend/src/pages/PlaylistBrowser.tsx` (extend) -- replace direct `playlists` import with `usePlaylists()` hook; add "Link YouTube Playlist" section (OAuth button + URL input); show source_type badge on playlist cards
- `frontend/src/pages/PlaylistDetail.tsx` (extend) -- fetch from backend with `usePlaylists()`; add hide/unlink buttons; show removed video styling
- `frontend/src/pages/HiddenPlaylists.tsx` (new) -- page showing all playlists hidden by the current account with restore/unhide actions
- `frontend/src/components/PlaylistCard.tsx` (extend) -- add `sourceType` badge display and hidden/unlinked visual styling
- `frontend/src/components/VideoListItem.tsx` (extend) -- add `isRemoved` visual styling (strikethrough title, dimmed opacity, "Removed" badge)
- `frontend/src/components/UserMenu.tsx` (extend) -- add "Disconnect YouTube" option when user has linked YouTube account
- `frontend/src/components/YouTubeLinkButton.tsx` (new) -- button that opens Google OAuth in a popup/new window
- `frontend/src/components/PlaylistUrlInput.tsx` (new) -- text input + submit button for pasting a YouTube playlist URL
- `frontend/src/components/YouTubeCallbackHandler.tsx` (new) -- component for the OAuth callback route; extracts `?code=` from URL, calls `sendOAuthCode` API, then redirects back to PlaylistBrowser
- `frontend/src/components/MarkdownNotes.tsx` (extend) -- save/load notes through backend note API instead of localStorage
- `frontend/src/components/ThemeToggle.tsx` (new/extend existing UI) -- toggles dark/light theme and persists preference in browser storage
- `frontend/src/pages/WatchPage.tsx` (extend) -- handle `isRemoved` video cases and database-backed per-user notes
- `frontend/src/App.tsx` (extend) -- add routes `/youtube/callback` and `/playlists/hidden`

## Interfaces

### New components

**YouTubeLinkButton**
- Props: none (reads token/state from AuthContext and usePlaylists hook)
- Renders a styled button "Sign in with YouTube"
- On click: opens `window.location.href = auth_url` from `getYouTubeAuthUrl()` API
- Disabled state when already signed in (YouTubeOAuthToken exists on backend)

**PlaylistUrlInput**
- Props: `onLink: (url: string) => Promise<void>`, `isLoading: boolean`
- Renders input field with placeholder "Paste a YouTube playlist URL..." and "Import" button
- Validates that the URL matches `youtube.com/playlist?list=...` or `youtu.be/...` pattern before submitting
- Shows inline validation error for non-matching URLs, including the submitted URL and a clear message
- Shows loading state while import is in progress

**YouTubeCallbackHandler**
- Route: `/youtube/callback`
- On mount: reads `code` from URL search params
- Calls `sendOAuthCode(token, code)` 
- On success: navigates to `/` (PlaylistBrowser)
- On error: navigates to `/` with error message in query param or shows inline error

### Component changes

**PlaylistCard** -- new props/fields consumed:
- `sourceType` badge: show "YouTube" for `oauth`, "Link" for `url`
- Hidden/unlinked styling: `opacity-50` and a "Hidden" overlay badge where appropriate

**VideoListItem** -- new behavior:
- When `video.isRemoved === true`: render with `opacity-50`, title with `line-through`, show a "Removed" badge
- Keep the item clickable (user can still watch a removed video)

**PlaylistBrowser** changes:
- Remove direct import of `playlists` from `mockData.ts`
- Use `usePlaylists()` hook to get backend playlists
- Add a header section with:
  - "Link YouTube Playlist" heading
  - YouTubeLinkButton (OAuth path)
  - "OR" divider
  - PlaylistUrlInput (URL path)
- Each PlaylistCard gets the `sourceType` prop for badge display

**PlaylistDetail** changes:
- Fetch playlist by ID from API
- Show "Hide playlist" and "Unlink playlist" actions
- Videos pass `isRemoved` to VideoListItem

**MarkdownNotes** changes:
- Load the current user's note for the current video from the backend
- Save note changes to the backend per user and per video
- Render markdown with `marked`
- Apply markdown preview when the user presses Enter, similar to Obsidian-style editing; for example, a line beginning with `#` becomes a heading after Enter

**HiddenPlaylists** changes:
- List playlists hidden by the current account
- Provide a restore/unhide action for each hidden playlist
- Restored playlists return to the main PlaylistBrowser

**ThemeToggle** changes:
- Toggle between dark and light themes
- Persist the selected theme in browser storage
- Apply the persisted theme when the app loads

**UserMenu** changes:
- Add "Disconnect YouTube" menu item
- Only show when `user.youtubeTokenExists` (fetch from a new API or derive from having oauth playlists)

### Route addition (`App.tsx`)

```typescript
<Route path="/youtube/callback" element={<YouTubeCallbackHandler />} />
<Route path="/playlists/hidden" element={<HiddenPlaylists />} />
```

This route should be inside the `<ProtectedRoute>` wrapper since OAuth requires authentication.

## Acceptance

- [ ] PlaylistBrowser shows real playlists fetched from the backend
- [ ] "Sign in with YouTube" button opens Google OAuth consent screen
- [ ] After OAuth callback, user is redirected to PlaylistBrowser with their YouTube playlists visible
- [ ] Pasting a valid YouTube playlist URL imports it and shows it in the grid
- [ ] Invalid URLs show an inline error message that includes the submitted URL
- [ ] Each playlist card shows a source badge (YouTube / Link)
- [ ] Hiding a playlist removes it from the main PlaylistBrowser and shows it on the hidden playlists page
- [ ] Restoring/unhiding a playlist removes it from the hidden playlists page and returns it to the main PlaylistBrowser
- [ ] Unlinking a playlist from PlaylistDetail dissociates it without deleting cached data
- [ ] Videos marked as `is_removed` show a "Removed" badge with strikethrough title
- [ ] "Disconnect YouTube" in UserMenu removes OAuth-linked playlists and hides the menu item
- [ ] Per-user notes load from and save to the database
- [ ] Markdown preview updates when Enter is pressed
- [ ] Lines beginning with `#` render as headings after Enter
- [ ] Theme toggle switches dark/light mode and persists the preference in the browser
- [ ] TypeScript compilation passes (`cd frontend && npx tsc -b`)
- [ ] All existing functionality (navigation, watch, notes) continues to work

## Tests

- `frontend/src/components/__tests__/PlaylistUrlInput.test.tsx` (new) -- test URL validation, submit handler
- `frontend/src/components/__tests__/YouTubeLinkButton.test.tsx` (new) -- test click opens OAuth URL
- `frontend/src/pages/__tests__/PlaylistBrowser.test.tsx` (new) -- test rendering with backend playlists
- `frontend/src/pages/__tests__/HiddenPlaylists.test.tsx` (new) -- test hidden playlist rendering
- `frontend/src/components/__tests__/VideoListItem.test.tsx` (extend) -- test isRemoved rendering
- `frontend/src/components/__tests__/MarkdownNotes.test.tsx` (extend) -- test database load/save and sentence-level preview behavior

Use `vitest` with `@testing-library/react` for component tests.

## Size

L (this is the largest slice -- contains multiple UI components and page rewrites)

## Security

### Findings

1. **OAuth popup vs redirect.** The plan specifies "button that opens Google OAuth in a popup/new window." Using `window.location.href = auth_url` (full-page redirect) is more secure than a popup because it prevents clickjacking and cross-origin popup issues. If a popup is used, ensure the popup has `noopener` and `noreferrer` attributes, and the redirect URI handles the popup closing and returning focus to the main window. Recommend a full-page redirect over popup unless UX requires otherwise.

2. **OAuth callback page must not expose the authorization code to other scripts.** The `YouTubeCallbackHandler` component extracts `code` from the URL. Ensure this component:
   - Does not render the code anywhere in the DOM
   - Does not log the code to console
   - Removes the `?code=` parameter from the URL after extraction (using `window.history.replaceState`) to prevent accidental sharing via copy-paste
   These are basic OAuth best practices.

3. **Disconnect YouTube confirmation.** The "Disconnect YouTube" action in UserMenu should include a confirmation dialog before executing. The action is destructive (removes OAuth-linked playlists from view) and irreversible in the UI (though data persists in DB). This is an UX concern that also prevents accidental security-sensitive actions.

4. **Playlist URL input must sanitize display, not execution.** The `PlaylistUrlInput` component should render the imported URL as text only. Since the URL is user-supplied and will be displayed somewhere in the UI (e.g., as the playlist source), ensure it is rendered as text content, not as an `href` attribute or inside `dangerouslySetInnerHTML`. React's default JSX escaping handles this for text content, but if the URL is used in an `<a>` tag, use `target="_blank" rel="noopener noreferrer"`.

5. **`isRemoved` visual indicators must not obscure UI for screen readers.** The plan specifies `opacity-50` styling for removed items. Ensure this is supplemented with `aria-label` attributes or `role="presentation"` changes so screen readers can distinguish removed from active items. The visual "Removed" badge should have `role="status"` or similar accessible semantics.

6. **Video ID transition.** The existing code uses `localStorage.setItem('youtube-video-id', video.id)` in `VideoListItem.tsx`. After the type change, `video.id` is the DB primary key (number), not the YouTube video ID. The WatchPage reads `localStorage.getItem('youtube-video-id')` to pass to YouTubePlayer. This must be updated to use `video.youtubeVideoId` instead. This is a runtime correctness issue (broken watch flow) rather than a security issue, but it is a critical acceptance failure if missed.

### No blockers. Six findings above are advisory or should-fix level. Finding 6 is a critical correctness issue that must be fixed.
