# Plan: Obsidian Enter Markdown Behavior

## Goal

Add Obsidian-style Enter handling to the markdown notes textarea so pressing Enter after common markdown prefixes continues or finalizes the markdown structure in-place while preserving the existing edit/preview toggle and localStorage-backed notes.

## Context

The frontend is a React 19 + TypeScript + Vite app under `frontend/`. The package manager is npm, with available scripts in `frontend/package.json`: `npm run lint`, `npm run build`, and `npm run dev`.

Markdown notes are implemented in `frontend/src/components/MarkdownNotes.tsx`. The component currently:

- Stores notes in `localStorage` using `youtube-notes:<videoId>` or `youtube-notes`.
- Renders preview HTML with `marked.parse(notes)`.
- Uses a plain controlled `<textarea>` with `value={notes}` and `onChange={(e) => setNotes(e.target.value)}`.
- Has no `onKeyDown` handling for Enter.

`MarkdownNotes` is used in:

- `frontend/src/pages/WatchPage.tsx`, keyed by route `videoId`.
- `frontend/src/pages/PlaylistDetail.tsx`, keyed by the currently selected playlist video.

The repository already documents this feature as not implemented:

- `docs/features.md`: "Obsidian-style Enter markdown behavior -- markdown preview exists, but headings do not auto-format on Enter in the editor."
- `docs/project-requirements.md`: "Markdown preview behavior should apply when the user presses Enter, similar to Obsidian-style editing; for example, starting a line with `#` turns that line into a heading after Enter."

There is no configured frontend unit test runner on `master`; TypeScript and lint are the current verification tools.

## Assumptions

- "Obsidian-style Enter markdown behavior" means textarea editing conveniences, not replacing the textarea with a rich text editor or live preview editor.
- The first implementation should handle the common markdown continuation cases users expect from Obsidian-like notes:
  - Heading marker completion when pressing Enter on a line that starts with `#`, `##`, etc.
  - Unordered list continuation for `- `, `* `, and `+ `.
  - Ordered list continuation with incremented numeric markers like `1. ` to `2. `.
  - Task list continuation for `- [ ] ` and `- [x] `, resetting the next item to unchecked.
  - Blockquote continuation for `> `.
- Empty list/task/blockquote items should be finalized by removing the current marker and inserting a plain newline instead of creating another marker.
- Code fences should not auto-continue headings, lists, tasks, or blockquotes while the cursor is inside a fenced code block.
- Existing localStorage persistence and markdown preview rendering remain unchanged.

## Open Questions

None.

## Files To Modify

- `frontend/src/components/MarkdownNotes.tsx`
  - Add textarea `onKeyDown` handling for Enter.
  - Keep existing `onChange`, preview toggle, `marked` preview, `localStorage` key behavior, and styling intact.
  - Use a textarea ref or event target selection properties to restore the caret after programmatic note updates.

- `docs/features.md`
  - Update only the implemented/not implemented feature inventory entry for Obsidian-style Enter behavior after implementation is complete.
  - Do not rewrite unrelated feature inventory sections.

## Files To Add

- `frontend/src/lib/markdownEnter.ts`
  - Purpose: isolate the Enter key transformation logic from React so it is deterministic and testable.
  - Expected exports:
    - `applyMarkdownEnter(input: MarkdownEnterInput): MarkdownEnterResult | null`
    - `type MarkdownEnterInput`
    - `type MarkdownEnterResult`
  - This helper should not read from or write to the DOM.

Optional only if Agent B adds a frontend test runner already accepted by project conventions:

- `frontend/src/lib/markdownEnter.test.ts`
  - Focused unit tests for markdown Enter transformation cases.
  - Do not add this file if adding a test runner would require dependency churn beyond the agreed scope.

## Do Not Touch

- Do not replace the textarea with a third-party editor, CodeMirror, ProseMirror, Monaco, or contenteditable surface.
- Do not change markdown preview sanitization or `marked` configuration in this feature.
- Do not change notes persistence from `localStorage` to backend APIs.
- Do not modify backend Django files, models, serializers, migrations, or API routes.
- Do not modify authentication, protected routing, playlist fetching, video selection, or YouTube player behavior.
- Do not update dependencies unless the project owner explicitly approves adding a frontend test runner.
- Do not refactor unrelated page layout, theme styling, playlist UI, or markdown preview CSS.
- Do not change public API request or response shapes.

## Function Signatures And Interfaces

Add the following pure helper:

```ts
export interface MarkdownEnterInput {
  value: string
  selectionStart: number
  selectionEnd: number
}

export interface MarkdownEnterResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

export function applyMarkdownEnter(
  input: MarkdownEnterInput,
): MarkdownEnterResult | null
```

Behavior:

- Return `null` when Enter should fall back to the browser's default textarea behavior.
- Return a full replacement value plus collapsed selection positions when custom behavior is applied.
- If a text range is selected, return `null`; do not implement multi-line selected-range behavior in this feature.
- Preserve leading indentation before markdown markers.
- Preserve the text before and after the cursor.
- Insert exactly one newline for normal continuation.
- The helper must not mutate external state and must not depend on React.

Expected marker handling:

- Heading line:
  - Input line matches leading whitespace followed by `#{1,6}` and optional following space.
  - Pressing Enter inserts `\n` after the current line.
  - Do not add another heading marker on the next line.
  - Ensure a missing heading space is normalized before the line content when useful, for example `#Title|` becomes `# Title\n|`.
  - If the cursor is in the middle of the line, preserve text after the cursor after the inserted newline.

- Unordered list item:
  - Non-empty `- item|` becomes `- item\n- |`.
  - Empty `- |` becomes `\n|` after removing the current marker.
  - Preserve indentation, for example `  - item|` becomes `  - item\n  - |`.

- Ordered list item:
  - Non-empty `1. item|` becomes `1. item\n2. |`.
  - Empty `1. |` becomes `\n|` after removing the current marker.
  - Preserve indentation and increment the numeric marker by 1.

- Task list item:
  - Non-empty `- [x] item|` and `- [ ] item|` continue as `- [ ] |`.
  - Empty `- [ ] |` and `- [x] |` become `\n|` after removing the current marker.
  - Preserve indentation.

- Blockquote:
  - Non-empty `> quote|` becomes `> quote\n> |`.
  - Empty `> |` becomes `\n|` after removing the current marker.
  - Preserve nested quote marker shape as tightly as practical, for example `> > quote|` should continue with `> > |`.

- Fenced code block:
  - If the cursor is inside an open triple-backtick or triple-tilde fenced code block, return `null`.
  - This prevents list-like or heading-like text inside code blocks from being rewritten.

React integration:

- In `MarkdownNotes`, add `const textareaRef = useRef<HTMLTextAreaElement | null>(null)`.
- Add `handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>)`.
- On `e.key !== 'Enter'`, do nothing.
- On Shift+Enter, do nothing and allow native newline behavior.
- On Enter with a non-null helper result:
  - `e.preventDefault()`.
  - `setNotes(result.value)`.
  - Restore selection after React updates. Use `requestAnimationFrame` or a layout-safe equivalent against `textareaRef.current`.
- The textarea should receive `ref={textareaRef}` and `onKeyDown={handleKeyDown}`.

Error behavior:

- The helper should be defensive around invalid selection values by returning `null` if positions are out of bounds or `selectionStart > selectionEnd`.
- React handler should no-op if the event target selection fields are unavailable.

Side effects:

- Only `MarkdownNotes` should update React state.
- Existing `useEffect` persists the updated note to `localStorage`; do not add additional persistence side effects.

## Implementation Steps

1. Create `frontend/src/lib/markdownEnter.ts` with the input/result types and `applyMarkdownEnter` helper.
2. Implement line-boundary parsing around the cursor:
   - Determine current line start/end.
   - Split current line into prefix before cursor and suffix after cursor.
   - Preserve document text before line, current line updates, and text after cursor.
3. Add fenced-code detection based on lines before the cursor:
   - Count unmatched opening/closing fences for ``` and `~~~`.
   - Return `null` when inside a fence.
4. Implement marker detection in priority order:
   - Task list.
   - Ordered list.
   - Unordered list.
   - Blockquote.
   - Heading normalization/newline.
5. Implement empty marker finalization for list/task/blockquote lines.
6. Wire the helper into `MarkdownNotes.tsx` with a textarea ref and Enter-only keydown handler.
7. Preserve existing textarea classes, placeholder, controlled value, localStorage persistence, and preview behavior.
8. Update `docs/features.md` to move or reword the Obsidian-style Enter behavior entry so it reflects the implemented behavior on this branch.
9. Run formatting if the project has an established formatter command. If not, keep formatting consistent with existing TypeScript style.
10. Run required verification commands.

## Acceptance Criteria

- Pressing Enter after `# Heading` inserts a newline and leaves the completed heading line as markdown that renders as a heading in preview.
- Pressing Enter after `#Heading` normalizes the heading to `# Heading` and inserts a newline.
- Pressing Enter after a non-empty unordered list item continues the same marker on the next line.
- Pressing Enter on an empty unordered list item exits the list.
- Pressing Enter after a non-empty ordered list item increments the next numeric marker.
- Pressing Enter on an empty ordered list item exits the list.
- Pressing Enter after a task item creates a new unchecked task item.
- Pressing Enter on an empty task item exits the task list.
- Pressing Enter after a non-empty blockquote continues the blockquote.
- Pressing Enter on an empty blockquote exits the blockquote.
- Shift+Enter keeps native textarea behavior.
- Enter inside fenced code blocks keeps native textarea behavior.
- Notes continue to persist under the same localStorage keys.
- Preview toggle behavior is unchanged.
- The feature works in both `WatchPage` and `PlaylistDetail` because both use `MarkdownNotes`.
- `npm run lint` passes from `frontend/`.
- `npm run build` passes from `frontend/`.

## Testing Requirements

Required verification:

- Command: `npm run lint`
  - Working directory: `frontend/`
  - Expected result: exits 0.

- Command: `npm run build`
  - Working directory: `frontend/`
  - Expected result: exits 0.

Manual browser/editor checks:

- Run `npm run dev` from `frontend/`.
- Open a route that renders `MarkdownNotes`, preferably a playlist detail page or watch page with a selected `videoId`.
- In edit mode, verify the acceptance criteria for headings, unordered lists, ordered lists, task lists, blockquotes, Shift+Enter, and fenced code blocks.
- Toggle preview and verify rendered markdown still appears as before.

Focused unit tests:

- If a test runner is already present by the time Agent B implements this, add `frontend/src/lib/markdownEnter.test.ts`.
- Required unit cases:
  - Heading normalization: `#Title|` to `# Title\n|`.
  - Unordered list continuation and empty item exit.
  - Ordered list increment and empty item exit.
  - Task list continuation resets to unchecked.
  - Blockquote continuation and empty quote exit.
  - Fenced code block returns `null`.
  - Selected text range returns `null`.
- If no test runner exists, do not add dependencies solely for this feature; rely on lint, build, and manual checks.

Out of scope for tests:

- No broad end-to-end suite.
- No snapshot tests.
- No markdown preview rendering tests unless an existing test setup makes them trivial.

## Edge Cases

- Cursor at the start, middle, or end of a markdown line.
- Document with text before and after the current line.
- Indented nested list items.
- Multi-digit ordered list markers like `9.` to `10.`.
- Empty marker lines with trailing spaces.
- Cursor inside fenced code blocks containing markdown-looking text.
- Windows-style pasted content may contain `\r\n`; helper should avoid corrupting content. Prefer preserving existing newline style if practical, or document if the app normalizes to `\n`.
- Invalid selection positions should fall back to native behavior.

## Risks

- Caret restoration can race React controlled textarea updates if implemented synchronously; use a post-update selection restore.
- Over-eager regexes could rewrite text inside code fences or normal paragraphs that resemble markdown.
- Empty-marker finalization could accidentally remove user content if whitespace/content detection is too broad.
- Adding a test runner would create dependency churn; avoid unless already available or explicitly approved.
- `marked.parse` is still rendered via `dangerouslySetInnerHTML`; this feature must not expand that surface.

## Out Of Scope

- Live preview or rich text editing.
- Toolbar buttons, keyboard shortcut discovery UI, or editor command palette.
- Backend note persistence.
- Markdown sanitization changes.
- Mobile-specific editor redesign.
- Import/export of notes.
- Broad markdown auto-pairing such as bold/italic marker completion.

## Done Definition

- `feature-obsidian-enter-markdown` branch contains the plan and implementation.
- `MarkdownNotes` handles Enter through the pure helper while preserving existing behavior.
- Documentation feature inventory reflects the new implemented behavior.
- Required lint and build commands pass.
- Manual editor checks cover the acceptance criteria.
- No unrelated files or architectural areas are modified.
- Any remaining limitations are documented in the final implementation summary.
