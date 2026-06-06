import { insertNewlineAndIndent } from '@codemirror/commands'
import type { StateCommand } from '@codemirror/state'
import { EditorSelection } from '@codemirror/state'

const listPattern = /^(\s*)([-+*])\s+(\[[ xX]\]\s+)?(.*)$/
const orderedListPattern = /^(\s*)(\d+)([.)])\s+(.*)$/
const blockquotePattern = /^(\s*>+\s?)(.*)$/
const emptyTaskPattern = /^(\s*)[-+*]\s+\[[ xX]\]\s*$/
const emptyListPattern = /^(\s*)[-+*]\s*$/
const emptyOrderedListPattern = /^(\s*)\d+[.)]\s*$/
const emptyBlockquotePattern = /^(\s*>+\s?)$/

function isInsideFence(doc: { lines: number; line: (number: number) => { text: string } }, lineNumber: number) {
  let insideFence = false

  for (let i = 1; i < lineNumber; i += 1) {
    if (/^\s*(```|~~~)/.test(doc.line(i).text)) {
      insideFence = !insideFence
    }
  }

  return insideFence
}

export const markdownEnterCommand: StateCommand = ({ state, dispatch }) => {
  const selection = state.selection.main
  if (!selection.empty || isInsideFence(state.doc, state.doc.lineAt(selection.head).number)) {
    return insertNewlineAndIndent({ state, dispatch })
  }

  const line = state.doc.lineAt(selection.head)
  const beforeCursor = line.text.slice(0, selection.head - line.from)
  const afterCursor = line.text.slice(selection.head - line.from)

  if (afterCursor.trim()) {
    return insertNewlineAndIndent({ state, dispatch })
  }

  const emptyTask = emptyTaskPattern.exec(beforeCursor)
  const emptyList = emptyListPattern.exec(beforeCursor)
  const emptyOrderedList = emptyOrderedListPattern.exec(beforeCursor)
  const emptyBlockquote = emptyBlockquotePattern.exec(beforeCursor)

  if (emptyTask || emptyList || emptyOrderedList || emptyBlockquote) {
    const replacement = emptyTask?.[1] ?? emptyList?.[1] ?? emptyOrderedList?.[1] ?? ''
    const insert = replacement ? `\n${replacement}` : '\n'
    const cursor = line.from + insert.length

    dispatch(
      state.update({
        changes: { from: line.from, to: selection.head, insert },
        selection: EditorSelection.cursor(cursor),
        scrollIntoView: true,
      }),
    )
    return true
  }

  const taskList = listPattern.exec(beforeCursor)
  if (taskList) {
    const [, indent, bullet, taskMarker] = taskList
    const marker = taskMarker ? `${indent}${bullet} [ ] ` : `${indent}${bullet} `
    dispatch(
      state.update({
        changes: { from: selection.head, insert: `\n${marker}` },
        selection: EditorSelection.cursor(selection.head + marker.length + 1),
        scrollIntoView: true,
      }),
    )
    return true
  }

  const orderedList = orderedListPattern.exec(beforeCursor)
  if (orderedList) {
    const [, indent, number, delimiter] = orderedList
    const marker = `${indent}${Number(number) + 1}${delimiter} `
    dispatch(
      state.update({
        changes: { from: selection.head, insert: `\n${marker}` },
        selection: EditorSelection.cursor(selection.head + marker.length + 1),
        scrollIntoView: true,
      }),
    )
    return true
  }

  const blockquote = blockquotePattern.exec(beforeCursor)
  if (blockquote) {
    const marker = blockquote[1].endsWith(' ') ? blockquote[1] : `${blockquote[1]} `
    dispatch(
      state.update({
        changes: { from: selection.head, insert: `\n${marker}` },
        selection: EditorSelection.cursor(selection.head + marker.length + 1),
        scrollIntoView: true,
      }),
    )
    return true
  }

  return insertNewlineAndIndent({ state, dispatch })
}

export const markdownEnterKeymap = {
  key: 'Enter',
  run: markdownEnterCommand,
}
