# YT Study frontend

React, TypeScript and Vite frontend for the authenticated playlist and notes workspace.

Run `npm install` and `npm run dev`. Local development automatically opens a demo account with mock playlists, videos, editable notes, and sample AI responses. No sign-in, Django server, or API keys are needed.

Mock changes (notes, AI preferences, imports, and unlinks) live in memory and reset on a page reload. Imports use sample metadata; AI responses are fixtures. YouTube account connections are unavailable in this mode. Thumbnails and embedded playback still use YouTube and require internet access.

To test real authentication and backend data locally, put `VITE_USE_MOCK_DATA=false` in `frontend/.env.local`, restart Vite, and run Django on port 8000. Production builds always use real authentication and APIs, regardless of this flag. Mock mode does not read or overwrite your saved authentication token. Keep backend configuration and credentials outside frontend code.

## Theme and workspace

The account controls and login/register pages include a System / Light / Dark selector. System follows the operating system. The choice is stored under `yt-study:theme`; denied storage falls back to an in-memory choice.

Playlist and standalone watch pages share a video/notes divider. Drag its grip, or focus it and use Left/Right (2 percentage points), Shift+Left/Right (10 points), Home/End (pane limits), or Enter/double-click (58% video). Ratios persist separately under `yt-study:playlist-pane-ratio` and `yt-study:watch-pane-ratio`. Temporary narrow layouts clamp the display without replacing the saved desktop preference.

Desktop playlists show a collapsible 280px video queue on the right. Collapsing it leaves a narrow Queue button and gives the space back to video and notes. Below 960px, video and notes stack and the queue opens as a floating panel on the right; it starts collapsed on small screens. The toggle supports keyboard activation, and Escape inside the queue collapses it and returns focus to the toggle. The divider also disappears whenever the measured space cannot fit 360px video + 320px notes + 12px separator. YouTube controls remain provider-controlled. The iframe and CodeMirror stay mounted across resizing and theme changes.

## Verification

Use Node 24 or newer for the native TypeScript unit tests; no additional test runner is required.

```sh
node --test tests/studyLayout.test.ts tests/theme.test.ts tests/mock.test.ts tests/mockMode.test.mjs
npm run build
npm run lint
```

The redesign was checked in headless Microsoft Edge at 390, 768, 1024, 1280 and 1440px in both themes. Checks covered iframe/editor identity, continuous real YouTube playback during drag/theme changes, keyboard resizing, pointer cancellation, stored/corrupt/denied preferences, OS theme changes, editor undo and slash timestamps, AI result/append/canceled replacement, library controls, import errors, remote picker closing, and logged-out redirects/form validation. New preferences were isolated from credential keys. No paid AI calls were made.

Five focused unit tests and the production build pass. Lint has one pre-existing `react-hooks/set-state-in-effect` error at `src/pages/PlaylistBrowser.tsx:142`; no new diagnostics were introduced. The existing bundle-size warning remains.

Populated playlists, note writes, OAuth picker and AI results were supplied at the browser network boundary for verification; fixtures are not part of production code. The local development account has no playlists. A final check with an existing populated authenticated playlist and real note persistence remains before marking the plan fully verified. Existing application storage access outside the new theme/layout preferences is unchanged.
