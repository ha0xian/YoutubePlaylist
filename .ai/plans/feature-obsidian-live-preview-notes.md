# Plan: Obsidian Live Preview Notes

## Goal

Replace the current textarea-based markdown notes editing surface with a CodeMirror 6 editor that supports an Obsidian-like editing-mode toggle:

- Source mode: raw Markdown editing.
- Live Preview mode: current cursor line stays editable as raw Markdown while inactive visible lines receive common Markdown preview styling/decorations.
- Preview mode: the existing full rendered `marked` preview remains available as a read-only view.

## Context

The current notes feature lives in `frontend/src/components/MarkdownNotes.tsx`. It stores notes per video in `localStorage`, renders a textarea in edit mode, and renders full HTML preview with `marked` in preview mode.

The notes component is used by:

- `frontend/src/pages/WatchPage.tsx`
- `frontend/src/pages/PlaylistDetail.tsx`

The frontend is React + TypeScript + Vite. Styling is currently mostly Tailwind utility classes plus markdown preview selectors in `frontend/src/index.css`. There is no frontend unit-test runner configured. Existing validation commands are:

- `npm run build`
- `npm run lint`

The current textarea cannot support inline rendered preview by line. CodeMirror 6 can support this through editor state, cursor awareness, syntax parsing, decorations, widgets, and custom keymaps.

The previous PR #13 branch implemented textarea-based Enter continuation. This plan should be based on `master`, not PR #13. The PR #13 behavior may be used only as a reference for markdown continuation rules, not as a base branch.

## Assumptions

- The feature starts from `master`.
- Live Preview preference is global for the notes editor, not per video.
- The global preference is persisted in `localStorage`.
- The existing per-video note content storage key format remains unchanged.
- The existing full Preview button remains backed by `marked`.
- The first Live Preview implementation supports common Markdown constructs only, not full `marked` parity.
- CodeMirror 6 dependencies may be added.
- Backend APIs and database models are not involved.

## Open Questions

None.

## Files To Modify

- Path: `frontend/package.json`
  - Purpose of change: add CodeMirror 6 dependencies required for a React-hosted markdown editor.
  - Specific areas to modify: `dependencies`.
  - Expected behavior after modification: `npm install` installs the editor packages used by the new notes editor.

- Path: `frontend/package-lock.json`
  - Purpose of change: lock the added CodeMirror dependencies.
  - Specific areas to modify: generated dependency lock entries.
  - Expected behavior after modification: clean deterministic install/build.

- Path: `frontend/src/components/MarkdownNotes.tsx`
  - Purpose of change: replace the textarea edit surface with the new CodeMirror editor component while preserving note storage and full Preview mode.
  - Specific functions/components to modify: `MarkdownNotes`.
  - Expected behavior after modification:
    - Notes still load from and save to the same `localStorage` key.
    - Preview mode still renders `marked.parse(notes)`.
    - Edit mode renders CodeMirror.
    - Header exposes a toggle between Source and Live Preview editing modes.
    - Header still exposes full Preview/Edit behavior.
    - Changing videos still loads the correct note through the existing `key={videoId}` usage in parent pages.

- Path: `frontend/src/index.css`
  - Purpose of change: add CodeMirror editor and Live Preview decoration styles that match the existing dark notes panel.
  - Specific selectors to modify/add:
    - CodeMirror container/editor sizing selectors.
    - Source-mode editor baseline styles.
    - Live Preview classes for headings, inline code, bold, italic, links, blockquotes, lists, task markers, and fenced code.
  - Expected behavior after modification:
    - Editor fills the notes panel height.
    - Editor background/text colors match the existing dark theme.
    - Live Preview decorations are readable and do not visually clash with existing `.markdown-preview` styles.

- Path: `docs/features.md`
  - Purpose of change: update feature inventory after implementation.
  - Specific sections to modify: implemented/not implemented markdown notes entries.
  - Expected behavior after modification: docs accurately state that notes support CodeMirror Source and Live Preview edit modes once implemented.

## Files To Add

- Path: `frontend/src/components/CodeMirrorMarkdownEditor.tsx`
  - Purpose: React wrapper around CodeMirror 6 for the markdown note editor.
  - Expected exports:
    - Default or named React component `CodeMirrorMarkdownEditor`.
  - Expected props:
    - `value: string`
    - `onChange: (value: string) => void`
    - `livePreview: boolean`
    - Optional `placeholder?: string`
  - Expected behavior:
    - Creates an `EditorView` once per mounted component.
    - Keeps CodeMirror document synchronized with React `value` without cursor jumps.
    - Calls `onChange` when the editor document changes.
    - Reconfigures Live Preview extensions when `livePreview` changes.
    - Cleans up the `EditorView` on unmount.

- Path: `frontend/src/lib/markdownLivePreview.ts`
  - Purpose: CodeMirror extension for common Markdown live-preview behavior.
  - Expected exports:
    - `markdownLivePreview(): Extension`
    - Supporting exported helper functions only if needed for focused validation.
  - Expected behavior:
    - Uses CodeMirror visible ranges and syntax/tree or line scanning to decorate inactive lines.
    - Leaves the active cursor line in raw Markdown source form.
    - Rebuilds decorations on document, viewport, and selection changes.
    - Supports common constructs listed in this plan.

- Path: `frontend/src/lib/markdownEditorCommands.ts`
  - Purpose: CodeMirror keymap/command helpers for Obsidian-style markdown Enter behavior within CodeMirror.
  - Expected exports:
    - `markdownEnterKeymap: Extension` or `markdownEnterCommand: StateCommand`
  - Expected behavior:
    - Enter continues unordered lists, ordered lists, task lists, and blockquotes.
    - Enter on an empty list/task/blockquote marker exits that structure.
    - Shift+Enter inserts a plain newline or defers to CodeMirror default behavior, as appropriate.
    - Does not run inside fenced code blocks.

## Do Not Touch

- Do not modify backend models, serializers, views, URLs, migrations, settings, or tests.
- Do not change playlist, video, auth, import, or YouTube player behavior.
- Do not change note storage from browser `localStorage` to backend persistence.
- Do not change existing per-video storage key format.
- Do not remove the full `marked` Preview mode.
- Do not continue implementation from PR #13 as the base branch.
- Do not introduce a broad design-system refactor.
- Do not update unrelated dependencies.
- Do not fix unrelated existing lint failures unless the edited files introduce them.

## Function Signatures And Interfaces

```ts
interface CodeMirrorMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  livePreview: boolean
  placeholder?: string
}
```

```ts
function CodeMirrorMarkdownEditor(props: CodeMirrorMarkdownEditorProps): JSX.Element
```

Behavior:

- `value` is the canonical note content from React state.
- `onChange` receives the full Markdown document string after user edits.
- `livePreview=false` configures Source mode only.
- `livePreview=true` enables common Markdown Live Preview decorations.
- The component must not write to `localStorage` directly; `MarkdownNotes` remains responsible for persistence.

```ts
function markdownLivePreview(): Extension
```

Behavior:

- Returns a CodeMirror extension.
- Must be safe to include only when Live Preview mode is enabled.
- Must not mutate the document text.
- Must not render untrusted raw HTML from Markdown source inside the editor.
- Must only create visual decorations/widgets for known common Markdown syntax.

```ts
const markdownEnterKeymap: Extension
```

Behavior:

- Handles Enter behavior through CodeMirror transactions.
- Returns `true` only when it handles the key.
- Returns `false` to allow CodeMirror defaults for unsupported contexts.
- Must preserve undo/redo behavior as normal CodeMirror transactions.

LocalStorage keys:

```ts
const FALLBACK_KEY = 'youtube-notes'
const EDITOR_MODE_KEY = 'youtube-notes:editor-mode'
```

Allowed `EDITOR_MODE_KEY` values:

```ts
type MarkdownEditorMode = 'source' | 'live-preview'
```

Validation behavior:

- Invalid/missing editor-mode values should default to `live-preview` or `source`; choose one explicitly in implementation and keep it consistent. Recommended default: `live-preview`, because the requested feature is Obsidian-like.

## Implementation Steps

1. Start from `master` on branch `feature-obsidian-live-preview-notes`.
2. Add CodeMirror dependencies to `frontend/package.json` and regenerate `frontend/package-lock.json`.
3. Add `frontend/src/components/CodeMirrorMarkdownEditor.tsx`.
4. Implement the CodeMirror lifecycle:
   - create an editor host ref
   - initialize `EditorState`
   - mount `EditorView`
   - forward document changes to `onChange`
   - respond to external `value` changes without unnecessary full reinitialization
   - destroy on unmount
5. Add baseline CodeMirror extensions:
   - markdown language support
   - history
   - default keymap
   - history keymap
   - tab/indent behavior if needed
   - dark-theme editor styling hooks
6. Add `frontend/src/lib/markdownEditorCommands.ts`.
7. Implement Enter continuation for common markdown structures in CodeMirror transactions.
8. Add `frontend/src/lib/markdownLivePreview.ts`.
9. Implement Live Preview decoration rebuilding for visible ranges only.
10. Hide or replace Markdown syntax only on lines that do not contain the main selection/cursor.
11. Support common Live Preview constructs:
    - `#`, `##`, `###` headings styled larger and marker visually hidden
    - `**bold**` and `*italic*` markers visually hidden with text styled
    - inline code backticks visually hidden with code styling
    - links styled with URL/marker syntax visually de-emphasized or hidden only when reliable
    - `> blockquote` marker visually hidden with quote styling
    - unordered and ordered list markers styled consistently
    - `- [ ]` and `- [x]` task markers shown as checkbox-like widgets
    - fenced code blocks styled as code blocks while leaving active fenced lines editable
12. Update `MarkdownNotes.tsx`:
    - preserve existing note state and storage effect
    - add global editor mode state from `localStorage`
    - add Source/Live Preview toggle in edit mode
    - render `CodeMirrorMarkdownEditor` instead of textarea when not in full Preview mode
    - keep full Preview/Edit button behavior
13. Update `frontend/src/index.css` with CodeMirror and live-preview classes.
14. Update `docs/features.md` after implementation.
15. Run validation commands listed in Testing Requirements.

## Acceptance Criteria

- Notes still save and load per video using the existing `youtube-notes:<videoId>` keys.
- Full Preview mode still renders the whole note through `marked`.
- Edit mode no longer uses a textarea.
- Source mode shows raw Markdown in CodeMirror.
- Live Preview mode can be toggled globally and persists across videos/reloads.
- In Live Preview mode, the current cursor line remains raw/editable.
- In Live Preview mode, inactive visible lines display common Markdown styling/decorations.
- Pressing Enter on a line causes the previous line to become inactive and therefore preview-styled when Live Preview is enabled.
- Enter continuation works for unordered lists, ordered lists, task lists, and blockquotes.
- Empty list/task/blockquote markers exit the structure on Enter.
- Fenced code blocks do not receive list/task Enter continuation.
- No backend behavior changes.
- The app builds successfully.

## Testing Requirements

- Test file additions:
  - Do not add a broad frontend test framework just for this feature.
  - If helper parsing/command functions are written as pure functions, add narrow validation through a small script or direct Node/TypeScript-compatible sanity check if practical.

- Manual/unit-level validation:
  - Source mode:
    - Type headings, lists, tasks, blockquotes, inline code, bold, italic, links, and fenced code.
    - Confirm raw Markdown remains visible.
  - Live Preview mode:
    - Put cursor on a Markdown line and confirm that line remains raw.
    - Press Enter and confirm the previous line becomes preview-styled.
    - Move cursor back to a preview-styled line and confirm raw Markdown is visible/editable again.
  - Persistence:
    - Switch between Source and Live Preview, reload the page, and confirm the selected mode persists globally.
    - Switch videos and confirm notes remain per-video.

- Required commands:
  - From `frontend/`: `npm run build`
  - From `frontend/`: `npm run lint`

- Expected passing result:
  - `npm run build` passes.
  - `npm run lint` should pass for touched files. If repository-level lint still fails on pre-existing unrelated files, document the exact unrelated failures and do not broaden the feature scope to fix them.

- Out of scope tests:
  - No end-to-end browser automation is required for the plan unless implementation changes layout enough that manual visual verification is insufficient.
  - No backend tests are required.

## Edge Cases

- Empty notes should render an empty editor without errors.
- Notes without `videoId` should still use the fallback key.
- Multiple cursors/selections should keep all selected lines raw or conservatively disable preview on selected ranges.
- Cursor at start/end of document should not crash decoration logic.
- Large notes should decorate visible ranges only, not the entire document on every update.
- Unclosed bold/italic/code markers should remain raw rather than producing broken decorations.
- Nested lists should preserve indentation and continue at the same nesting level.
- Ordered lists should increment the next number where practical.
- Task list continuation should create an unchecked task item.
- Fenced code blocks should be treated conservatively; avoid hiding syntax inside code content.
- Raw HTML in markdown should not be rendered inside Live Preview decorations.

## Risks

- CodeMirror lifecycle bugs can cause cursor jumps if React state synchronization is too aggressive.
- Decoration logic can make text hard to edit if it hides syntax on the active line.
- Link and inline emphasis parsing can become fragile if implemented with broad regexes. Keep unsupported or ambiguous cases raw.
- Live Preview and full `marked` Preview will not be perfectly identical in the first implementation.
- CSS conflicts may occur between `.markdown-preview` and CodeMirror classes if selectors are too broad.
- Repository-level lint may expose existing unrelated issues.

## Out Of Scope

- Full Obsidian feature parity.
- Rendering all CommonMark/GFM edge cases inside the editor.
- Database-backed notes.
- Collaborative editing.
- Mobile-specific editor redesign.
- Theme settings or a broader settings panel.
- YouTube/player/playlist behavior changes.
- Merging or continuing PR #13 as the primary implementation.

## Done Definition

- Branch is based on `master`.
- CodeMirror replaces textarea editing in `MarkdownNotes`.
- Source and Live Preview edit modes both work.
- Global edit-mode preference persists.
- Existing full Preview mode remains available.
- Common Markdown Live Preview decorations work for inactive lines.
- Active cursor line remains raw Markdown.
- Markdown Enter behavior works in the CodeMirror editor for the specified structures.
- `docs/features.md` is updated.
- `npm run build` has been run and passes.
- `npm run lint` has been run, with any unrelated existing failures documented.
- No backend files are changed.
