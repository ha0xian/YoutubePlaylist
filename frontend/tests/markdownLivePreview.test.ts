import test from 'node:test'
import assert from 'node:assert/strict'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { buildMarkdownDecorations } from '../src/lib/markdownLivePreview.ts'

function preview(doc: string, cursor = 0, focused = true) {
  const state = EditorState.create({ doc, selection: { anchor: cursor }, extensions: [markdown()] })
  const decorations = buildMarkdownDecorations(state, focused)
  const entries: { from: number; to: number; className?: string; replacement: boolean; widget?: string }[] = []
  decorations.between(0, doc.length, (from, to, value) => {
    entries.push({ from, to, className: value.spec.class, replacement: 'widget' in value.spec, widget: value.spec.widget?.text })
  })
  assert.equal(state.doc.toString(), doc)
  return entries
}

test('headings are styled during typing and reveal their source only on the active line', () => {
  for (let level = 1; level <= 6; level++) {
    const text = `${'#'.repeat(level)} Heading\nnext`
    assert.ok(preview(text, level + 2).some(d => d.className?.includes(`cm-md-heading-${level}`)))
    assert.equal(preview(text, level + 2).filter(d => d.replacement).length, 0)
    assert.ok(preview(text, text.length).some(d => d.replacement && d.from === 0 && d.to === level + 1))
    assert.ok(preview(text, 0, false).some(d => d.replacement))
  }
})

test('inline formatting stays styled while editing and supports nested and underscore emphasis', () => {
  const text = '**bold** and _italic_ and ***both***'
  const active = preview(text, 4)
  assert.ok(active.some(d => d.className === 'cm-md-strong' && d.from === 0))
  assert.ok(!active.some(d => d.replacement && d.from === 0))
  assert.ok(active.some(d => d.className === 'cm-md-emphasis'))
  assert.ok(active.some(d => d.replacement && d.from > 8))
  assert.doesNotThrow(() => preview('*italic*', 0, false))
})

test('code and escaped Markdown remain literal, including mismatched fence markers', () => {
  for (const text of ['````\n## literal\n~~~\n**literal**\n````', '    ## literal\n    **literal**', '\\*literal\\*']) {
    assert.ok(!preview(text, 0, false).some(d => d.replacement || d.className === 'cm-md-strong' || d.className?.includes('cm-md-heading')))
  }
  const inline = preview('`**literal**`', 0, false)
  assert.ok(inline.some(d => d.className === 'cm-md-inline-code'))
  assert.ok(!inline.some(d => d.className === 'cm-md-strong'))
})

test('bullets and tasks render without changing the saved Markdown', () => {
  const entries = preview('- item\n- [ ] pending\n- [x] done\n1. ordered', 0, false)
  assert.deepEqual(entries.filter(d => d.widget !== undefined).map(d => d.widget), ['•', '', '✓'])
})

test('links hide destinations, reveal on edit, and never create executable HTML', () => {
  const doc = '[label](javascript:alert)\n<img src=x onerror=alert(1)>'
  assert.ok(preview(doc, 0, false).some(d => d.replacement && d.to === doc.indexOf('\n')))
  assert.ok(!preview(doc, 3).some(d => d.replacement))
  assert.ok(preview(doc, 0, false).every(d => d.widget === undefined))
})
