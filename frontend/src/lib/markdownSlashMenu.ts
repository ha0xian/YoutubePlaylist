import type { Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

type SlashMenuItemId = 'heading' | 'todo' | 'quote' | 'timestamp'

interface SlashMenuItem {
  id: SlashMenuItemId
  title: string
  description: string
  shortcut: string
  aliases?: string[]
}

interface MarkdownSlashMenuOptions {
  insertTimestamp?: () => string | null
}

const slashMenuItems: SlashMenuItem[] = [
  {
    id: 'heading',
    title: 'Heading',
    description: 'Add a section title',
    shortcut: '#',
  },
  {
    id: 'todo',
    title: 'To-do',
    description: 'Create a task item',
    shortcut: '[]',
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a quote or key point',
    shortcut: '>',
  },
  {
    id: 'timestamp',
    title: 'Timestamp',
    description: 'Insert the current video time',
    shortcut: '00:00',
    aliases: ['ts', 'time'],
  },
]

interface SlashMenuState {
  from: number
  to: number
  query: string
  items: SlashMenuItem[]
}

function getSlashMenuState(view: EditorView): SlashMenuState | null {
  const selection = view.state.selection.main
  if (!selection.empty) {
    return null
  }

  const line = view.state.doc.lineAt(selection.head)
  const beforeCursor = line.text.slice(0, selection.head - line.from)
  const match = /(^|\s)\/([\w-]*)$/.exec(beforeCursor)

  if (!match) {
    return null
  }

  const query = match[2].toLowerCase()
  const items = slashMenuItems.filter((item) => {
    const haystack = [
      item.id,
      item.title,
      item.description,
      item.shortcut,
      ...(item.aliases ?? []),
    ].join(' ').toLowerCase()
    return haystack.includes(query)
  })

  return {
    from: selection.head - query.length - 1,
    to: selection.head,
    query,
    items,
  }
}

class SlashMenuView {
  private readonly view: EditorView
  private readonly options: MarkdownSlashMenuOptions
  private readonly dom: HTMLDivElement
  private state: SlashMenuState | null = null
  private positionTimer: number | null = null
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (!this.state || (event.key !== 'Enter' && event.key !== 'Tab')) {
      return
    }

    const firstItem = this.state.items[0]
    if (firstItem && this.execute(firstItem)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  constructor(view: EditorView, options: MarkdownSlashMenuOptions) {
    this.view = view
    this.options = options
    this.dom = document.createElement('div')
    this.dom.className = 'cm-slash-menu'
    this.dom.setAttribute('role', 'listbox')
    this.dom.setAttribute('aria-label', 'Note functions')
    document.body.appendChild(this.dom)
    this.view.dom.addEventListener('keydown', this.handleKeyDown, true)
    this.updateMenu()
  }

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.selectionSet ||
      update.geometryChanged ||
      update.viewportChanged ||
      update.focusChanged
    ) {
      this.updateMenu()
    }
  }

  destroy() {
    this.view.dom.removeEventListener('keydown', this.handleKeyDown, true)
    if (this.positionTimer !== null) {
      window.clearTimeout(this.positionTimer)
    }
    this.dom.remove()
  }

  private updateMenu() {
    this.state = getSlashMenuState(this.view)

    if (!this.state) {
      this.dom.style.display = 'none'
      return
    }

    this.render()
    this.schedulePosition()
  }

  private render() {
    if (!this.state) {
      return
    }

    this.dom.replaceChildren()
    this.dom.style.display = 'block'

    const header = document.createElement('div')
    header.className = 'cm-slash-menu-header'
    header.textContent = this.state.query
      ? `Functions matching "/${this.state.query}"`
      : 'Functions'
    this.dom.appendChild(header)

    if (this.state.items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'cm-slash-menu-empty'
      empty.textContent = 'No functions found'
      this.dom.appendChild(empty)
      return
    }

    for (const item of this.state.items) {
      const row = document.createElement('button')
      row.className = 'cm-slash-menu-item'
      row.type = 'button'
      row.setAttribute('role', 'option')
      row.setAttribute('aria-disabled', item.id === 'timestamp' ? 'false' : 'true')
      row.tabIndex = -1
      row.addEventListener('mousedown', (event) => {
        event.preventDefault()
        this.execute(item)
      })

      const icon = document.createElement('span')
      icon.className = 'cm-slash-menu-icon'
      icon.textContent = item.shortcut

      const copy = document.createElement('span')
      copy.className = 'cm-slash-menu-copy'

      const title = document.createElement('span')
      title.className = 'cm-slash-menu-title'
      title.textContent = item.title

      const description = document.createElement('span')
      description.className = 'cm-slash-menu-description'
      description.textContent = item.description

      const status = document.createElement('span')
      status.className = 'cm-slash-menu-status'
      status.textContent = item.id === 'timestamp' ? 'Enter' : 'Soon'

      copy.append(title, description)
      row.append(icon, copy, status)
      this.dom.appendChild(row)
    }
  }

  private execute(item: SlashMenuItem) {
    if (!this.state || item.id !== 'timestamp') {
      return false
    }

    const replacement = this.options.insertTimestamp?.()
    if (!replacement) {
      return false
    }

    this.view.dispatch({
      changes: {
        from: this.state.from,
        to: this.state.to,
        insert: replacement,
      },
      selection: {
        anchor: this.state.from + replacement.length,
      },
      scrollIntoView: true,
    })
    this.view.focus()
    this.updateMenu()
    return true
  }

  private schedulePosition() {
    if (this.positionTimer !== null) {
      window.clearTimeout(this.positionTimer)
    }

    this.positionTimer = window.setTimeout(() => {
      this.positionTimer = null
      this.position()
    }, 0)
  }

  private position() {
    if (!this.state) {
      return
    }

    const editorRect = this.view.dom.getBoundingClientRect()
    const coords = this.view.coordsAtPos(this.state.to) ?? {
      bottom: editorRect.top + 44,
      left: editorRect.left + 16,
      top: editorRect.top + 20,
    }

    this.dom.style.display = 'block'

    const menuRect = this.dom.getBoundingClientRect()
    const margin = 10
    const left = Math.min(
      Math.max(coords.left, margin),
      window.innerWidth - menuRect.width - margin,
    )
    const availableBelow = window.innerHeight - coords.bottom
    const top = availableBelow > menuRect.height + margin
      ? coords.bottom + 8
      : Math.max(margin, coords.top - menuRect.height - 8)

    this.dom.style.left = `${left}px`
    this.dom.style.top = `${top}px`
  }
}

export function markdownSlashMenu(options: MarkdownSlashMenuOptions = {}): Extension {
  return ViewPlugin.define((view) => new SlashMenuView(view, options))
}
