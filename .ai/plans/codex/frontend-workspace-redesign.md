# Plan: Frontend workspace redesign

## Goal

Implement the approved direction from design preview 02 across the existing React frontend, preserving all current controls and functionality. Add thumbnails to the redesigned queue, a draggable divider that adjusts video and notes widths, and a consistent dark theme with a light-theme option. This artifact is planning only: do not modify the running preview or implement the frontend during this task.

## Context

- Branch: `codex/frontend-workspace-redesign`. It is already checked out; no branch switch is needed. Plan and state paths retain the branch's `codex/` path segment.
- Stack: React 19, TypeScript 6, React Router 7, Vite 8, Tailwind 4, native CSS. Existing dependencies include CodeMirror, marked, and DOMPurify. No frontend test runner is installed; local Node is v24.15.0 and supports native execution of erasable TypeScript in focused Node tests.
- Visual reference, read-only: `C:/Users/NorthWhite/.codex/visualizations/2026/09/20/01a0bf6a-04fa-70e2-a2e9-58840abf6943/yt-study-preview.html`, revision 2 (the second script and appended styles). Do not copy its sample data, contenteditable editor, simulated actions, invented lesson descriptions, or fabricated statistics into production. This plan records the durable requirements if that local reference becomes unavailable.
- Visual direction: neutral surfaces, existing YT Study wordmark/play mark and red accent, restrained borders, 8px controls and 12px surfaces, clearer spacing and typography, no background glows. Keep the established sans-serif/system font stack; avoid adding font or icon dependencies.
- `/login` and `/register` use `AuthPage`; protected `/`, `/playlist/:id`, and `/watch/:videoId` use `PlaylistBrowser`, `PlaylistDetail`, and `WatchPage`. Routes and guards are already wired in `App.tsx`.
- `AppShell` renders Library, Playlists, My Playlist, History, Watch Later, Notes, Trash, Settings, Templates, Keyboard Shortcuts, and Collapse. Several are intentionally disabled. Preserve their current destinations and enabled/disabled states, even where names share a destination.
- The browser contains totals, both import forms, OAuth connection/picker controls, playlist actions, disabled search/sort/grid controls, and `UserMenu` with Logout.
- `PlaylistDetail` currently places queue and notes vertically in a narrow right column. The new desktop layout separates queue, video, and notes. `WatchPage` has video and notes without a queue.
- `VideoListItem` already consumes `Video.thumbnailUrl`, duration, channel, views, and removed status. Thumbnail support is a layout adaptation, not a backend feature.
- `YouTubePlayer` owns its URL input, Load/Enter handling, iframe lifecycle, playback ID persistence, and imperative `getCurrentTime`/`seekTo` handle. Preserve these contracts.
- `MarkdownNotes` owns authenticated per-video loading/saving, Source/Live Preview/Preview, timestamps, and Notes/AI tabs. Preserve the real CodeMirror editor and DOMPurify rendering; the preview's simplified editor is not an implementation reference.
- `AIAnalysisPanel` owns seven presets, prompt preferences, analyze/regenerate, copy, append, and confirmed replacement. Preserve its requests and state transitions.
- Existing `index.css` contains dark-only colors for app surfaces, markdown, CodeMirror, and the slash menu attached to `document.body`. Theme changes must cover all of these.
- Existing docs contain historical descriptions (including local-only note storage); current source and API clients are authoritative.
- Uncommitted user changes exist in `.claude/settings.local.json`, `CLAUDE.md`, `backend/config/settings.py`, `docs/features.md`, and `docs/project-requirements.md`. Preserve them exactly.

## Assumptions

- The latest preview is accepted as a direction, with all real controls retained. It is not approval to remove functionality or implement disabled future features.
- “Adjust their length” means horizontal pane widths using a vertical separator, not resizing player height or introducing a timeline.
- Resize applies to both playlist detail and standalone watch. Queue width is not draggable.
- Keep both dark and light modes. With no stored preference, follow OS color scheme; a visible System/Light/Dark selector allows override. This preserves the requested dark experience without removing the preview's light option.
- Persist only theme preference and pane ratio locally; use separate keys from credentials and notes. These are device preferences, not backend/account settings.
- On narrow layouts, stack panels and hide the divider. Preserve the last desktop ratio for returning to a wide layout.
- No new dependency or backend endpoint is needed.

## Open Questions

None.

## Files To Modify

| Path | Purpose, target, and resulting behavior |
|---|---|
| `frontend/src/main.tsx` | Initialize theme before React mounts and wrap existing providers with `ThemeProvider`; keep StrictMode, router, and auth composition intact. |
| `frontend/src/index.css` | Replace hardcoded app/editor colors with semantic variables; define light/dark surfaces, focus, errors, selection, markdown, slash-menu and AI states; implement responsive shell, queue, and pane styles. |
| `frontend/src/components/AppShell.tsx` | Restyle shell/navigation and connection footer; keep all labels, links, buttons, disabled states and footer slot; make all controls reachable on mobile. |
| `frontend/src/components/UserMenu.tsx` | Restyle actual user/account display and Logout; host shared theme selector wherever this component appears. Keep logout logic intact. |
| `frontend/src/pages/AuthPage.tsx` | Apply matching typography, form surfaces, validation and theme selector to login/register; retain field order, auth handlers, redirect state and errors. |
| `frontend/src/pages/PlaylistBrowser.tsx` | Recompose header, totals, imports, OAuth picker and collection; preserve all existing handlers and conditional states, including personal-playlist source distinctions. |
| `frontend/src/components/PlaylistCard.tsx` | Restyle real thumbnails, titles, metadata and action menu; preserve Refresh/Unlink availability, propagation, loading and menu semantics. |
| `frontend/src/pages/PlaylistDetail.tsx` | Compose queue rail plus shared resizable video/notes workspace; retain data effects, selected/removed video logic, refresh/unlink, More, search, queue actions, errors and UserMenu. |
| `frontend/src/pages/WatchPage.tsx` | Use shared resizable video/notes workspace; preserve Back, Resources, Share, account, removed warning and player/notes refs. |
| `frontend/src/components/VideoListItem.tsx` | Add optional compact queue presentation with a real thumbnail, duration, title, channel and views; preserve existing fallback navigation, onSelect and removed styling. |
| `frontend/src/components/YouTubePlayer.tsx` | Limit changes to presentation/layout classes for load bar and iframe host; maintain every loading, parsing, lifecycle and imperative-handle behavior. |
| `frontend/src/components/MarkdownNotes.tsx` | Restyle header, tabs, editor mode controls and all save/load/error states without changing note effects, preview sanitization, append/replace or timestamp logic. |
| `frontend/src/components/AIAnalysisPanel.tsx` | Restyle preset grid, prompt, preference actions, result and errors for both themes and narrow widths; retain every handler, limit and confirmation. |
| `frontend/src/components/CodeMirrorMarkdownEditor.tsx` | Adapt theme/font presentation only where needed; preserve extension setup, history, cursor, compartment updates and cleanup. Never recreate editor on theme/resize. |
| `frontend/README.md` | Add short usage/verification notes for theme and keyboard/pointer resizing, plus focused test commands and minimum Node 24 prerequisite for those commands. |
| `.ai/state/codex/frontend-workspace-redesign.json` | Track planned → in_progress → ready_for_review and any actual blockers; do not mark ready before checks pass. |

## Files To Add

| Path | Purpose and expected exports |
|---|---|
| `frontend/src/components/ResizableStudyWorkspace.tsx` | Reusable two-pane layout with optional queue slot; default export `ResizableStudyWorkspace`. Own separator behavior, resize observation and layout preference. |
| `frontend/src/lib/studyLayout.ts` | DOM-free pane math and validated preference parsing. Export ratio/bounds types, constants and helpers specified below. |
| `frontend/src/lib/theme.ts` | Export theme types, preference parsing, resolution, safe storage helpers and pre-mount theme initializer. |
| `frontend/src/theme/ThemeContext.ts` | Export context and `useTheme()` hook; no component export in this file. |
| `frontend/src/theme/ThemeProvider.tsx` | Export only `ThemeProvider`, managing preference, OS listener and document root attribute. |
| `frontend/src/components/ThemeSelect.tsx` | Accessible native System/Light/Dark selector using theme context; shared by authenticated user menus and auth page. |
| `frontend/tests/studyLayout.test.ts` | Focused `node:test` unit tests for ratio math, bounds and corrupted saved values. |
| `frontend/tests/theme.test.ts` | Focused `node:test` unit tests for preference parsing/resolution and unavailable storage. |

## Do Not Touch

- Do not modify the external preview HTML/server or copy them into the application.
- Do not edit backend code, database, migrations, API clients, auth context/provider/guard, route definitions in `App.tsx`, token persistence, OAuth permissions/callbacks, or API response shapes.
- Do not change current import, synchronization, unlink/disconnect, confirmation or retry semantics.
- Do not implement currently disabled search, sorting, history, watch-later, templates, sharing, resources, Remove watched, Collapse or other future actions.
- Do not rename navigation labels, change routes, reorder auth fields, or replace the existing logo.
- Do not alter note autosave timing, race/abort handling, server persistence, sanitization, editor keyboard commands, slash-menu insertion logic or AI prompt text. `markdownLivePreview.ts`, `markdownEditorCommands.ts`, `markdownSlashMenu.ts`, and `recommendedPrompts.ts` remain unchanged; theme their existing classes through CSS.
- Do not replace the YouTube iframe with mock imagery or bespoke playback controls.
- Do not add packages, change lockfiles/build configuration, commit generated previews/screenshots/dist output, or refactor unrelated modules.
- Do not overwrite/stash/revert/stage the user's pre-existing changes. Do not push, deploy or create a PR as part of this plan.

## Function Signatures And Interfaces

### Resizable workspace

```ts
interface ResizableStudyWorkspaceProps {
  queue?: React.ReactNode
  video: React.ReactNode
  notes: React.ReactNode
  storageKey: 'yt-study:playlist-pane-ratio' | 'yt-study:watch-pane-ratio'
}
function ResizableStudyWorkspace(props: ResizableStudyWorkspaceProps): React.JSX.Element

interface PaneBounds { min: number; max: number }
const DEFAULT_VIDEO_RATIO = 0.58
const MIN_VIDEO_WIDTH = 360
const MIN_NOTES_WIDTH = 320
const SEPARATOR_WIDTH = 12
function getPaneBounds(availableWidth: number): PaneBounds | null
function clampPaneRatio(ratio: number, bounds: PaneBounds): number
function parseStoredPaneRatio(value: string | null): number
function paneRatioFromPointer(clientX: number, containerLeft: number, availableWidth: number): number
```

- Ratios describe video width as a fraction of **video + notes space**, excluding queue and separator. Measure the actual split container, not viewport width. `availableWidth` excludes the 12px separator.
- `getPaneBounds`: return null for nonfinite/nonpositive widths or widths below 680px; otherwise `{min: 360 / availableWidth, max: 1 - 320 / availableWidth}`. When insufficient room, render stacked panes without a draggable separator.
- `clampPaneRatio`: nonfinite input falls back to 0.58, then clamps to supplied valid bounds. `parseStoredPaneRatio` accepts only finite numeric persisted values strictly between 0 and 1; missing, blank, malformed, endpoint or out-of-range values return 0.58. Parsing cannot throw.
- `paneRatioFromPointer` computes and clamps the pointer's position to current bounds; invalid geometry falls back to 0.58. No DOM or storage calls in pure helpers.
- Desktop >=1280px: 260px thumbnail queue rail, then flexible split workspace. At 960–1279px, move queue below video; keep the split only when actual measured space satisfies minima. Below 960px, stack video, notes and queue, with all controls reachable. Standalone Watch has no queue.
- Default desktop split 58% video / 42% notes; restored valid ratios are clamped to current bounds. Use separate preference keys for playlist and watch.
- A 12px focusable separator (`role="separator"`, `aria-orientation="vertical"`, label “Resize video and notes”) sits between panes, with a thin visual rule and visible grip. Expose current/min/max percentages and `aria-controls` referencing stable pane IDs.
- Pointer down captures pointer; movement updates a CSS custom property through refs/requestAnimationFrame rather than re-rendering the player/editor on every event. Commit React ratio and storage once drag ends. Prevent text selection and apply `touch-action:none` only to the handle while needed.
- Overlay the iframe during drag so pointer movement over it is not lost. Remove overlay and temporary cursor/selection changes on pointerup, pointercancel, lost capture and unmount. Clean up requestAnimationFrame and ResizeObserver, including React StrictMode cycles.
- Left/Right moves by 2 percentage points; Shift+arrow by 10; Home/End sets current min/max. Prevent arrow scrolling only when the separator is focused. Enter or double-click restores 58%. Announce updated ARIA values and persist completed keyboard changes.
- Observe container changes and clamp display ratio safely; do not overwrite the user's stored desktop preference merely because mobile/temporary viewport constraints apply.
- Keep iframe and CodeMirror mounted, at stable DOM positions and keys, throughout resize/theme/layout changes. Use CSS grid areas to move the queue rather than alternate React branches that remount children.
- Player maintains a bounded 16:9 area within its pane; widening must not produce horizontal page overflow. Independent queue/editor scrolling is allowed on desktop. On mobile use natural document flow, not inaccessible nested fixed-height scrolling.
- Storage reads/writes are caught; unavailable storage affects persistence only, never renders or interaction.

### Theme

```ts
type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'
function parseThemePreference(value: string | null): ThemePreference
function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme
function readThemePreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference
function writeThemePreference(storage: Pick<Storage, 'setItem'> | null, preference: ThemePreference): void
function initializeTheme(): void
interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}
function useTheme(): ThemeContextValue
function ThemeProvider(props: { children: React.ReactNode }): React.JSX.Element
function ThemeSelect(): React.JSX.Element
```

- Key `yt-study:theme`; invalid/missing values become `system`. `initializeTheme` safely reads storage, checks media preference and sets `document.documentElement.dataset.theme` and `color-scheme` before `createRoot().render`.
- Storage helpers catch failures; a null or throwing storage object yields System on read and a no-op on write. Accessing `window.localStorage` itself must also be guarded before passing it to a helper.
- Provider listens to system theme changes, but applies them only in System mode. Remove listeners on unmount. State remains usable if localStorage throws; never clear unrelated keys.
- CSS variables: `--app-bg`, `--surface`, `--surface-muted`, `--text`, `--text-muted`, `--border`, `--accent`, `--accent-text`, `--accent-soft`, `--danger`, `--focus-ring`, plus editor selection/code surfaces as needed. Light baseline: #f7f7f8 / #fdfdfd / #222226 / #63636d, red #bf3039. Dark baseline: #171719 / #1e1e21 / #eeeeef / #aaaab4, red #ed7e86 with dark text on accent buttons. Verify contrast rather than assuming these cover every combination.
- Native iframe content remains provider-controlled; do not promise theme control over YouTube chrome. The iframe surround, load bar, removed warning and all first-party content follow theme.

### Existing component contracts

- Extend `VideoListItemProps` only with `variant?: 'default' | 'queue'` (default `default`). Preserve `video`, `isSelected`, `onSelect`. Queue rows show a 96x54 thumbnail at desktop, duration, two-line title, channel and views with a clear selected treatment. At mobile use a 112x63 thumbnail where space permits. Use `thumbnailUrl`; on missing/failed images show the existing local `/favicon.svg` within the same reserved box, with a one-time fallback guard.
- Selected and removed statuses must remain distinguishable in both themes. Keyboard activation of selectable rows is equivalent to click, without removing current navigation behavior.
- `YouTubePlayerHandle`, `MarkdownNotesProps`, `AIAnalysisPanel` callbacks, auth forms, and all API interfaces remain unchanged. Do not pass resizing or theme as keys that remount stateful components.

## Implementation Steps

1. Recheck branch/status and relevant files. Record pre-change `npm run build` and `npm run lint` results; mark state in_progress. Compare the control inventory below against live source before editing.
2. Implement pure layout/theme utilities and focused unit tests. Add theme provider/select and pre-mount initialization, then establish semantic CSS variables.
3. Apply tokens across existing app, forms, menus, loading/errors, markdown, CodeMirror and body-level slash menu. Verify light and dark text contrast and focus visibility.
4. Restyle AppShell, UserMenu, auth, browser, cards, imports, totals and remote picker. Keep actual metadata and handlers. Navigation remains fully available; mobile may reflow or use an accessible drawer, but must not drop controls.
5. Implement shared resizable workspace with pointer/keyboard support, bounds, storage failure handling, iframe shielding and cleanup. Keep it presentation-only; do not move network state into it.
6. Compose PlaylistDetail with thumbnail queue and video/notes slots; compose WatchPage with video/notes only. Apply compact `VideoListItem` variant without changing selection, removed-video or fallback route behavior.
7. Restyle notes/AI to the full-height document surface. Preserve Source, Live Preview, Preview/Edit, slash commands, timestamps, seven AI presets, saved prompt state and result operations.
8. Verify the complete control inventory and targeted scenarios below. Update README and branch state with checks, actual limitations and review readiness. Do not copy preview-only controls such as its sample-state switches into the application.

## Acceptance Criteria

- [ ] Library, auth, playlist and standalone watch follow the approved neutral/red design in both light and dark themes.
- [ ] Existing routes, labels, real account data, API contracts and enabled/disabled states are preserved.
- [ ] Navigation retains Library, Playlists, My Playlist, History, Watch Later, Notes, Trash, Settings, Templates, Keyboard Shortcuts and Collapse; mobile keeps every item reachable.
- [ ] Library retains all totals, both imports, Connect/Connected picker/Disconnect, remote Refresh/Save/Close/checkboxes, per-playlist actions, search, Sort by: Last updated, Grid and Logout.
- [ ] Playlist retains Back, search, Refresh where appropriate, Unlink, More, Queue/Remove watched, account/logout, video URL input/Load and removed-video messaging.
- [ ] Standalone Watch retains Back, Resources, Share, account/logout, URL input/Load and notes. No new navigation feature is inferred from the prototype's extra Focus Watch button.
- [ ] Queue uses real thumbnails with reserved dimensions and safe fallback, duration, title, channel/views, selection and removed states. No sample content ships.
- [ ] Notes retains Notes/AI tabs, Source/Live Preview, Preview/Edit, real CodeMirror history/commands/slash menu, timestamp insertion/seeking, autosave and save/load/error states.
- [ ] AI retains all seven presets, prompt count/limit, Save as default/Clear default, Analyze video/Regenerate, Copy, Append to Notes and confirmed Replace Notes, plus loading/errors.
- [ ] Dragging separator adjusts video/notes widths within bounds on both routes; pointer release over the iframe cannot leave resizing stuck.
- [ ] Keyboard-only users can adjust/reset the separator and inspect its current value. Layout persists across reload and tolerates corrupt/blocked storage.
- [ ] Theme preference persists, System mode reacts to OS changes, and all first-party states including editor selection and slash menus are legible.
- [ ] Theme switching, resize and breakpoint changes preserve playback position, unsaved note text, editor undo/cursor state and AI result state; they trigger no unrelated API requests.
- [ ] At 390px and 768px, panels/controls reflow without horizontal page scrolling; at 1280px and 1440px, desktop queue and minimum pane widths hold. Divider is absent in stacked mode.
- [ ] Existing external preview is unchanged and user edits are preserved.

## Testing Requirements

Run from `frontend/` unless stated otherwise. No new runner, snapshots or broad interaction suite.

1. **Unit: `tests/studyLayout.test.ts`**, using `node:test` and `node:assert/strict`, importing only DOM-free `src/lib/studyLayout.ts`.
   - Valid saved ratio and malformed/null/blank/NaN/infinite/out-of-range preferences.
   - Minima at exactly 680px; narrower/zero widths stack; default 58% and drag/keyboard outcomes clamp correctly on wide containers.
   - Nonzero container offset and excluded queue/separator space yield correct pointer ratios, preventing jumps while dragging.
2. **Unit: `tests/theme.test.ts`**, same native tools.
   - Missing/invalid values choose System; explicit modes override OS; System follows both OS outcomes.
   - Inject a minimal throwing storage stub into safe storage helpers to verify read/write failure does not throw and fallback preferences remain usable. Keep helper arguments explicit and avoid global browser setup.
   - Command for both files: `node --test tests/studyLayout.test.ts tests/theme.test.ts` (Node 24). Expected: all focused cases pass.
3. **Static/build checks:** `npm run lint` and `npm run build`. Expected: success; if a pre-existing failure is present, record the baseline and prove no new diagnostics instead of modifying unrelated code.
4. **Focused browser integration verification**, no committed end-to-end suite required:
   - Real local authenticated playlist/watch: play, write an unsaved note, drag across iframe to both bounds, release/cancel, resize browser and switch themes. Confirm playback/note/editor state remains and native player controls work afterward.
   - Keyboard separator arrows/Shift/Home/End/Enter; reload ratio/theme; corrupt only new preference keys; verify unavailable localStorage fallback using a controlled local test environment. Never inspect/log credential keys.
   - Thumbnails with normal/missing/broken URLs; long titles; unavailable video; queue overflow; empty/error/loading playlist states.
   - Source ↔ Live Preview ↔ Preview/Edit, timestamp seek, slash menu, Notes ↔ AI tab state; append and cancel replacement confirmation. Avoid paid AI calls solely for visual QA: use an existing result or local mocked network boundary, never change production API code.
   - Inspect desktop 1440/1280, tablet 768 and mobile 390, both themes. Verify control inventory and no overflow. Exercise one import validation failure and remote picker close without performing destructive account actions for design testing.
   - Verify logged-out protected routes still redirect and auth field order/validation is unchanged.
5. Intentionally out of scope: backend tests for unchanged services, image snapshots, full auth/OAuth end-to-end automation, broad coverage increases and unrelated performance benchmarks. Actual browser drag/iframe verification is essential and cannot be replaced by pure math tests.

## Edge Cases

- Missing thumbnail or fallback image failure; repeated image `onError` must not loop.
- One/no video, unavailable video, long unbroken title/channel, slow loading and server errors.
- Notes with long code lines, large AI result, open slash menu and text selection during theme change.
- Pointer leaves window, crosses iframe, is canceled or component unmounts; resize state and shielding always clear.
- Container changes width mid-drag; recalculate bounds safely. No division by zero or negative grid tracks.
- Stored ratio legal for a large window but impossible in a smaller one; clamp displayed layout while retaining the saved preference.
- System theme changes while explicit preference is selected; explicit choice wins. Corrupt/blocked storage must not crash.
- StrictMode mount/unmount cycles must not leak observers, theme listeners, pointer listeners or animation frames.

## Risks

- Broad hardcoded Tailwind colors can survive token conversion and become illegible in light mode. Inspect every menu/error/editor state, not just the main background.
- A resize implementation that rekeys/moves children between render branches can destroy playback or editor state. Preserve mounted instances and isolate frame-by-frame layout writes.
- A compact queue can lose useful thumbnail/metadata detail; keep dimensions explicit and title wrap capped rather than hiding important metadata.
- Reference prototype includes incomplete/simulated behavior. Source control inventory and this plan override prototype omissions or additions.
- Existing URL-loader and per-video note binding semantics are outside this visual redesign. Do not silently change them; report any observed pre-existing inconsistency separately.
- Native iframe behavior and touch pointer capture require real browser validation; CSS/math tests alone are insufficient.

## Out Of Scope

Backend/auth/API redesign, new currently-disabled features, playlist reordering, draggable queue width, vertical height resizing, custom video controls, new AI behavior, replacement note editor, cloud preference synchronization, dependency upgrades, preview revision, publishing and deployment.

## Done Definition

- [ ] Only listed files were changed; any necessary scope deviation was explained before implementation.
- [ ] Every acceptance criterion and essential verification passes, with baseline failures/limitations explicitly recorded.
- [ ] No application functionality, disabled control or security boundary was silently removed or changed.
- [ ] No sample content, simulated actions, secrets, generated build output or screenshots entered the production diff.
- [ ] Frontend README and branch state reflect actual behavior and results; state is ready_for_review only after verification.
- [ ] Final implementation summary names files/lines, checks, and remaining risks. User's existing changes and the external preview remain untouched.
