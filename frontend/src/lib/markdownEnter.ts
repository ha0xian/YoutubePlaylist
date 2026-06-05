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
): MarkdownEnterResult | null {
  const { value, selectionStart, selectionEnd } = input

  if (selectionStart !== selectionEnd) return null

  const len = value.length
  if (selectionStart < 0 || selectionStart > len) return null
  if (selectionEnd < 0 || selectionEnd > len) return null

  const pos = selectionStart

  // Locate current line boundaries
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1
  const lineEnd = value.indexOf('\n', pos)
  const lineEndOrEnd = lineEnd === -1 ? len : lineEnd
  const currentLine = value.slice(lineStart, lineEndOrEnd)

  const textBefore = value.slice(0, lineStart)
  const textAfterLine = lineEnd === -1 ? '' : value.slice(lineEnd)

  const posInLine = pos - lineStart
  const beforeCursor = currentLine.slice(0, posInLine)
  const afterCursor = currentLine.slice(posInLine)

  // Fenced code block guard
  if (isInsideFencedCodeBlock(value, pos)) return null

  // Handlers in priority order: task → ordered → unordered → blockquote → heading
  return (
    tryTaskList(lineStart, currentLine, beforeCursor, afterCursor, textBefore, textAfterLine) ??
    tryOrderedList(lineStart, currentLine, beforeCursor, afterCursor, textBefore, textAfterLine) ??
    tryUnorderedList(lineStart, currentLine, beforeCursor, afterCursor, textBefore, textAfterLine) ??
    tryBlockquote(lineStart, currentLine, beforeCursor, afterCursor, textBefore, textAfterLine) ??
    tryHeading(lineStart, currentLine, beforeCursor, afterCursor, textBefore, textAfterLine, posInLine)
  )
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface LineMatch {
  nextMarker: string
  content: string
}

function buildResult(
  lineStart: number,
  beforeCursor: string,
  afterCursor: string,
  textBefore: string,
  textAfterLine: string,
  match: LineMatch,
): MarkdownEnterResult | null {
  const trimmedContent = match.content.trim()

  if (trimmedContent === '') {
    // Empty item → remove the marker line
    const value = textBefore + textAfterLine
    const sel = Math.min(lineStart, value.length)
    return { value, selectionStart: sel, selectionEnd: sel }
  }

  // Continuation: split at cursor, add marker on next line
  const newLine = beforeCursor + '\n' + match.nextMarker + afterCursor
  const value = textBefore + newLine + textAfterLine
  const sel = lineStart + beforeCursor.length + 1 + match.nextMarker.length

  return { value, selectionStart: sel, selectionEnd: sel }
}

// ---------------------------------------------------------------------------
// Fenced code block detection
// ---------------------------------------------------------------------------

function isInsideFencedCodeBlock(value: string, pos: number): boolean {
  const textBefore = value.slice(0, pos)
  const lines = textBefore.split('\n')
  let openFences = 0
  for (const line of lines) {
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      openFences++
    }
  }
  return openFences % 2 !== 0
}

// ---------------------------------------------------------------------------
// Marker matchers
// ---------------------------------------------------------------------------

function tryTaskList(
  lineStart: number,
  line: string,
  beforeCursor: string,
  afterCursor: string,
  textBefore: string,
  textAfterLine: string,
): MarkdownEnterResult | null {
  const m = line.match(/^(\s*)(- \[)([ x])\]\s?(.*)$/)
  if (!m) return null

  const indent = m[1]
  return buildResult(lineStart, beforeCursor, afterCursor, textBefore, textAfterLine, {
    nextMarker: `${indent}- [ ] `,
    content: m[4],
  })
}

function tryOrderedList(
  lineStart: number,
  line: string,
  beforeCursor: string,
  afterCursor: string,
  textBefore: string,
  textAfterLine: string,
): MarkdownEnterResult | null {
  const m = line.match(/^(\s*)(\d+)\.\s?(.*)$/)
  if (!m) return null

  const indent = m[1]
  const num = parseInt(m[2], 10)
  return buildResult(lineStart, beforeCursor, afterCursor, textBefore, textAfterLine, {
    nextMarker: `${indent}${num + 1}. `,
    content: m[3],
  })
}

function tryUnorderedList(
  lineStart: number,
  line: string,
  beforeCursor: string,
  afterCursor: string,
  textBefore: string,
  textAfterLine: string,
): MarkdownEnterResult | null {
  const m = line.match(/^(\s*)([-*+])\s?(.*)$/)
  if (!m) return null

  const indent = m[1]
  const bullet = m[2]
  return buildResult(lineStart, beforeCursor, afterCursor, textBefore, textAfterLine, {
    nextMarker: `${indent}${bullet} `,
    content: m[3],
  })
}

function tryBlockquote(
  lineStart: number,
  line: string,
  beforeCursor: string,
  afterCursor: string,
  textBefore: string,
  textAfterLine: string,
): MarkdownEnterResult | null {
  const m = line.match(/^(\s*)((?:>\s*)+)(.*)$/)
  if (!m) return null

  const prefix = m[2].replace(/\s+$/, '')
  const indent = m[1]
  const marker = `${indent}${prefix} `
  return buildResult(lineStart, beforeCursor, afterCursor, textBefore, textAfterLine, {
    nextMarker: marker,
    content: m[3],
  })
}

function tryHeading(
  lineStart: number,
  line: string,
  beforeCursor: string,
  afterCursor: string,
  textBefore: string,
  textAfterLine: string,
  posInLine: number,
): MarkdownEnterResult | null {
  const m = line.match(/^(\s*)(#{1,6})\s?(.*)$/)
  if (!m) return null

  const indent = m[1]
  const hashes = m[2]
  const content = m[3]
  const normalized = `${indent}${hashes} ${content}`

  if (normalized === line) {
    // Already well-formed heading — insert newline at cursor
    if (afterCursor === '') {
      const value = textBefore + line + '\n' + textAfterLine
      const sel = lineStart + line.length + 1
      return { value, selectionStart: sel, selectionEnd: sel }
    }
    const value = textBefore + beforeCursor + '\n' + afterCursor + textAfterLine
    const sel = lineStart + beforeCursor.length + 1
    return { value, selectionStart: sel, selectionEnd: sel }
  }

  // Heading needed normalization (missing space after #). A space was inserted
  // right after the hashes, so cursor positions at or after hashEnd shift by +1.
  const hashEnd = indent.length + hashes.length

  if (posInLine >= hashEnd) {
    if (afterCursor === '') {
      const value = textBefore + normalized + '\n' + textAfterLine
      const sel = lineStart + normalized.length + 1
      return { value, selectionStart: sel, selectionEnd: sel }
    }
    // Insert the missing space into beforeCursor at the right position
    const adjustedBefore =
      beforeCursor.slice(0, hashEnd - indent.length) +
      ' ' +
      beforeCursor.slice(hashEnd - indent.length)
    const value = textBefore + adjustedBefore + '\n' + afterCursor + textAfterLine
    const sel = lineStart + adjustedBefore.length + 1
    return { value, selectionStart: sel, selectionEnd: sel }
  }

  // Cursor before hash end (rare) — just normalize and put cursor after the line
  const value = textBefore + normalized + '\n' + textAfterLine
  const sel = lineStart + normalized.length + 1
  return { value, selectionStart: sel, selectionEnd: sel }
}
