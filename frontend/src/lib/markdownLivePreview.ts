import type { Extension, Range } from '@codemirror/state'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'

class TaskCheckboxWidget extends WidgetType {
  private readonly checked: boolean

  constructor(checked: boolean) {
    super()
    this.checked = checked
  }

  eq(widget: TaskCheckboxWidget) {
    return widget.checked === this.checked
  }

  toDOM() {
    const checkbox = document.createElement('span')
    checkbox.className = this.checked ? 'cm-md-task-checkbox is-checked' : 'cm-md-task-checkbox'
    checkbox.setAttribute('aria-hidden', 'true')
    checkbox.textContent = this.checked ? 'x' : ''
    return checkbox
  }
}

type PendingDecoration = Range<Decoration>

const headingPattern = /^(#{1,3})\s+/
const blockquotePattern = /^(\s*>+\s?)/
const listPattern = /^(\s*)([-+*]|\d+[.)])\s+/
const taskPattern = /^(\s*)[-+*]\s+\[([ xX])\]\s+/
const fencedCodePattern = /^\s*(```|~~~)/

function selectedLines(view: EditorView) {
  const lines = new Set<number>()
  for (const range of view.state.selection.ranges) {
    const fromLine = view.state.doc.lineAt(range.from).number
    const toLine = view.state.doc.lineAt(range.to).number
    for (let line = fromLine; line <= toLine; line += 1) {
      lines.add(line)
    }
  }
  return lines
}

function addInlineDecorations(items: PendingDecoration[], lineFrom: number, text: string) {
  const patterns = [
    {
      regex: /`([^`\n]+)`/g,
      className: 'cm-md-inline-code',
      markerLength: 1,
    },
    {
      regex: /\*\*([^*\n]+)\*\*/g,
      className: 'cm-md-strong',
      markerLength: 2,
    },
    {
      regex: /(^|[^*])\*([^*\n]+)\*/g,
      className: 'cm-md-emphasis',
      markerLength: 1,
      leadingOffset: 1,
    },
  ]

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const leadingOffset = pattern.leadingOffset ?? 0
      const matchStart = (match.index ?? 0) + leadingOffset
      const content = match[1 + (pattern.leadingOffset ? 1 : 0)]
      if (!content) {
        continue
      }

      const contentStart = lineFrom + matchStart + pattern.markerLength
      const contentEnd = contentStart + content.length
      const matchEnd = contentEnd + pattern.markerLength

      items.push(Decoration.replace({}).range(lineFrom + matchStart, contentStart))
      items.push(Decoration.mark({ class: pattern.className }).range(contentStart, contentEnd))
      items.push(Decoration.replace({}).range(contentEnd, matchEnd))
    }
  }

  for (const match of text.matchAll(/\[([^\]\n]+)\]\(([^)\s]+)\)/g)) {
    const start = lineFrom + (match.index ?? 0)
    const label = match[1]
    const labelStart = start + 1
    const labelEnd = labelStart + label.length
    const end = start + match[0].length

    items.push(Decoration.replace({}).range(start, labelStart))
    items.push(Decoration.mark({ class: 'cm-md-link' }).range(labelStart, labelEnd))
    items.push(Decoration.replace({}).range(labelEnd, end))
  }
}

function isFenceOpenBefore(view: EditorView, position: number) {
  let inFence = false
  let line = view.state.doc.line(1)

  while (line.from < position) {
    if (fencedCodePattern.test(line.text)) {
      inFence = !inFence
    }

    if (line.number >= view.state.doc.lines) {
      break
    }
    line = view.state.doc.line(line.number + 1)
  }

  return inFence
}

function buildDecorations(view: EditorView) {
  const activeLines = selectedLines(view)
  const items: PendingDecoration[] = []

  for (const visibleRange of view.visibleRanges) {
    let position = visibleRange.from
    let inFence = isFenceOpenBefore(view, visibleRange.from)

    while (position <= visibleRange.to) {
      const line = view.state.doc.lineAt(position)
      const text = line.text
      const active = activeLines.has(line.number)
      const fence = fencedCodePattern.test(text)

      if (!active) {
        if (fence || inFence) {
          items.push(Decoration.line({ class: 'cm-md-preview-line cm-md-fenced-code' }).range(line.from))
        }

        const heading = headingPattern.exec(text)
        if (heading) {
          const level = heading[1].length
          items.push(Decoration.line({ class: `cm-md-preview-line cm-md-heading cm-md-heading-${level}` }).range(line.from))
          items.push(Decoration.replace({}).range(line.from, line.from + heading[0].length))
        } else {
          const task = taskPattern.exec(text)
          if (task) {
            const checked = task[2].toLowerCase() === 'x'
            const markerStart = line.from + task[1].length
            const markerEnd = line.from + task[0].length
            items.push(Decoration.line({ class: 'cm-md-preview-line cm-md-list cm-md-task-list' }).range(line.from))
            items.push(Decoration.replace({ widget: new TaskCheckboxWidget(checked), inclusive: false }).range(markerStart, markerEnd))
          } else {
            const blockquote = blockquotePattern.exec(text)
            const list = listPattern.exec(text)

            if (blockquote) {
              items.push(Decoration.line({ class: 'cm-md-preview-line cm-md-blockquote' }).range(line.from))
              items.push(Decoration.replace({}).range(line.from, line.from + blockquote[1].length))
            } else if (list) {
              items.push(Decoration.line({ class: 'cm-md-preview-line cm-md-list' }).range(line.from))
            }
          }
        }

        if (!inFence) {
          addInlineDecorations(items, line.from, text)
        }
      }

      if (fence) {
        inFence = !inFence
      }

      position = line.to + 1
      if (position > view.state.doc.length) {
        break
      }
    }
  }

  items.sort((a, b) => a.from - b.from || a.to - b.to)

  const builder = new RangeSetBuilder<Decoration>()
  for (const item of items) {
    builder.add(item.from, item.to, item.value)
  }
  return builder.finish()
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)

export function markdownLivePreview(): Extension {
  return livePreviewPlugin
}
