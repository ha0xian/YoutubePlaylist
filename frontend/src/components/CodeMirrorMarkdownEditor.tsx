import { useEffect, useRef } from 'react'
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState, Compartment } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view'
import { markdownEnterKeymap } from '../lib/markdownEditorCommands'
import { markdownLivePreview } from '../lib/markdownLivePreview'

interface CodeMirrorMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  livePreview: boolean
  placeholder?: string
}

export default function CodeMirrorMarkdownEditor({
  value,
  onChange,
  livePreview,
  placeholder,
}: CodeMirrorMarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const livePreviewCompartmentRef = useRef(new Compartment())
  const initialValueRef = useRef(value)
  const initialLivePreviewRef = useRef(livePreview)
  const initialPlaceholderRef = useRef(placeholder)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!hostRef.current) {
      return undefined
    }

    const extensions: Extension[] = [
      history(),
      markdown(),
      keymap.of([markdownEnterKeymap, ...historyKeymap, ...defaultKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
        },
        '.cm-scroller': {
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        },
      }),
      livePreviewCompartmentRef.current.of(
        initialLivePreviewRef.current ? markdownLivePreview() : [],
      ),
    ]

    if (initialPlaceholderRef.current) {
      extensions.push(placeholderExtension(initialPlaceholderRef.current))
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions,
      }),
      parent: hostRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) {
      return
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    })
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }

    view.dispatch({
      effects: livePreviewCompartmentRef.current.reconfigure(
        livePreview ? markdownLivePreview() : [],
      ),
    })
  }, [livePreview])

  return <div ref={hostRef} className="markdown-editor h-full" />
}
