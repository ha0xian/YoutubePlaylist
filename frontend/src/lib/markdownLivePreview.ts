import type { EditorState, Extension, Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'

class MarkerWidget extends WidgetType {
  readonly text: string
  readonly className: string

  constructor(text: string, className: string) {
    super()
    this.text = text
    this.className = className
  }

  eq(other: MarkerWidget) {
    return other.text === this.text && other.className === this.className
  }

  toDOM() {
    const element = document.createElement('span')
    element.className = this.className
    element.textContent = this.text
    element.setAttribute('aria-hidden', 'true')
    return element
  }
}

// Decorations only change presentation. The saved document remains Markdown.
export function buildMarkdownDecorations(
  state: EditorState,
  focused: boolean,
  visibleRanges: readonly { from: number; to: number }[] = [{ from: 0, to: state.doc.length }],
): DecorationSet {
  const items: Range<Decoration>[] = []
  const visible = (from: number, to: number) => visibleRanges.some(range => from <= range.to && to >= range.from)
  const editing = (from: number, to: number) => focused && state.selection.ranges.some(range => range.from <= to && range.to >= from)
  const mark = (from: number, to: number, className: string) => {
    if (from < to) items.push(Decoration.mark({ class: className }).range(from, to))
  }
  const hide = (from: number, to: number, widget?: WidgetType) => {
    // View plugins must not replace line breaks.
    if (from < to && state.doc.lineAt(from).number === state.doc.lineAt(to).number) {
      items.push(Decoration.replace({ widget }).range(from, to))
    }
  }
  const styleLines = (from: number, to: number, className: string) => {
    for (let number = state.doc.lineAt(from).number; number <= state.doc.lineAt(to).number; number++) {
      const line = state.doc.line(number)
      if (visible(line.from, line.to)) items.push(Decoration.line({ class: `cm-md-preview-line ${className}` }).range(line.from))
    }
  }

  syntaxTree(state).iterate({
    enter({ node, name, from, to }) {
      if (!visible(from, to)) return false
      if (name === 'FencedCode' || name === 'CodeBlock') {
        styleLines(from, to, 'cm-md-fenced-code')
        return false
      }
      if (name === 'HTMLBlock' || name === 'HTMLTag' || name === 'Image') return false

      if (/^ATXHeading[1-6]$/.test(name)) {
        styleLines(from, to, `cm-md-heading cm-md-heading-${name.slice(-1)}`)
        const line = state.doc.lineAt(from)
        if (!editing(line.from, line.to)) {
          for (let child = node.firstChild; child; child = child.nextSibling) {
            if (child.name === 'HeaderMark') {
              let end = child.to
              while (end < line.to && /[ \t]/.test(state.doc.sliceString(end, end + 1))) end++
              hide(child.from, end)
            }
          }
        }
      }

      const inlineClass = ({ StrongEmphasis: 'cm-md-strong', Emphasis: 'cm-md-emphasis', InlineCode: 'cm-md-inline-code', Link: 'cm-md-link' } as Record<string, string>)[name]
      if (inlineClass) {
        mark(from, to, inlineClass)
        if (!editing(from, to)) {
          if (name === 'Link') {
            const opening = node.firstChild
            let closing = opening?.nextSibling
            while (closing && closing.name !== 'LinkMark') closing = closing.nextSibling
            if (opening && closing) {
              hide(opening.from, opening.to)
              hide(closing.from, to)
            }
          } else {
            for (let child = node.firstChild; child; child = child.nextSibling) {
              if (child.name === 'EmphasisMark' || child.name === 'CodeMark') hide(child.from, child.to)
            }
          }
        }
        if (name === 'InlineCode') return false
      }

      if (name === 'Blockquote') styleLines(from, to, 'cm-md-blockquote')
      if (name === 'QuoteMark') {
        const line = state.doc.lineAt(from)
        if (!editing(line.from, line.to)) hide(from, to)
      }
      if (name === 'ListItem') {
        const line = state.doc.lineAt(from)
        styleLines(line.from, line.to, 'cm-md-list')
      }
      if (name === 'ListMark') {
        const line = state.doc.lineAt(from)
        if (!editing(line.from, line.to) && /^[-+*]$/.test(state.doc.sliceString(from, to))) {
          const task = /^\s+\[([ xX])\](?:\s|$)/.exec(state.doc.sliceString(to, line.to))
          if (task) {
            const checked = task[1].toLowerCase() === 'x'
            hide(from, to + task[0].trimEnd().length, new MarkerWidget(checked ? '✓' : '', `cm-md-task-checkbox${checked ? ' is-checked' : ''}`))
          } else {
            hide(from, to, new MarkerWidget('•', 'cm-md-bullet'))
          }
        }
      }
    },
  })
  return Decoration.set(items, true)
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildMarkdownDecorations(view.state, view.hasFocus, view.visibleRanges)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = buildMarkdownDecorations(update.state, update.view.hasFocus, update.view.visibleRanges)
      }
    }
  },
  { decorations: plugin => plugin.decorations },
)

export function markdownLivePreview(): Extension {
  return livePreviewPlugin
}
