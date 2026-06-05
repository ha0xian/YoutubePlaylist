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

interface MarkerMatch {
  markerStart: number
  continuation: string
  content: string
  normalizePrefix?: string
}

const FENCE_PATTERN = /^\s*(```|~~~)/

export function applyMarkdownEnter(
  input: MarkdownEnterInput,
): MarkdownEnterResult | null {
  const { value, selectionStart, selectionEnd } = input

  if (
    selectionStart !== selectionEnd ||
    selectionStart < 0 ||
    selectionEnd < 0 ||
    selectionStart > value.length ||
    selectionEnd > value.length
  ) {
    return null
  }

  if (isInsideFence(value, selectionStart)) {
    return null
  }

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const nextLineBreak = value.indexOf('\n', selectionStart)
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak
  const line = value.slice(lineStart, lineEnd)
  const cursorOffset = selectionStart - lineStart
  const beforeCursor = line.slice(0, cursorOffset)
  const afterCursor = line.slice(cursorOffset)

  const markerMatch = getMarkerMatch(beforeCursor)
  if (!markerMatch) {
    return null
  }

  if (markerMatch.normalizePrefix !== undefined) {
    return replaceAroundCursor(
      value,
      lineStart,
      selectionStart,
      markerMatch.normalizePrefix,
      '\n',
      afterCursor,
    )
  }

  if (markerMatch.content.trim().length === 0) {
    const cleanedLineBeforeCursor = beforeCursor.slice(0, markerMatch.markerStart)

    return replaceAroundCursor(
      value,
      lineStart,
      selectionStart,
      cleanedLineBeforeCursor,
      '\n',
      afterCursor,
    )
  }

  return replaceAroundCursor(
    value,
    lineStart,
    selectionStart,
    beforeCursor,
    `\n${markerMatch.continuation}`,
    afterCursor,
  )
}

function replaceAroundCursor(
  value: string,
  lineStart: number,
  selectionStart: number,
  lineBeforeCursor: string,
  insertedText: string,
  afterCursor: string,
): MarkdownEnterResult {
  const beforeLine = value.slice(0, lineStart)
  const afterSelection = value.slice(selectionStart)
  const nextValue = `${beforeLine}${lineBeforeCursor}${insertedText}${afterCursor}${afterSelection.slice(afterCursor.length)}`
  const nextSelection = beforeLine.length + lineBeforeCursor.length + insertedText.length

  return {
    value: nextValue,
    selectionStart: nextSelection,
    selectionEnd: nextSelection,
  }
}

function getMarkerMatch(beforeCursor: string): MarkerMatch | null {
  const task = beforeCursor.match(/^(\s*)([-*+]\s+\[[ xX]\]\s+)(.*)$/)
  if (task) {
    const indentAndBullet = `${task[1]}${task[2].replace(/\[[ xX]\]/, '[ ]')}`

    return {
      markerStart: task[1].length,
      continuation: indentAndBullet,
      content: task[3],
    }
  }

  const ordered = beforeCursor.match(/^(\s*)(\d+)(\.\s+)(.*)$/)
  if (ordered) {
    const nextNumber = Number(ordered[2]) + 1

    return {
      markerStart: ordered[1].length,
      continuation: `${ordered[1]}${nextNumber}${ordered[3]}`,
      content: ordered[4],
    }
  }

  const unordered = beforeCursor.match(/^(\s*)([-*+]\s+)(.*)$/)
  if (unordered) {
    return {
      markerStart: unordered[1].length,
      continuation: `${unordered[1]}${unordered[2]}`,
      content: unordered[3],
    }
  }

  const blockquote = beforeCursor.match(/^(\s*)((?:>\s*)+)(.*)$/)
  if (blockquote) {
    return {
      markerStart: blockquote[1].length,
      continuation: `${blockquote[1]}${blockquote[2]}`,
      content: blockquote[3],
    }
  }

  const heading = beforeCursor.match(/^(\s*#{1,6})([^\s#].*)$/)
  if (heading) {
    return {
      markerStart: 0,
      continuation: '',
      content: heading[2],
      normalizePrefix: `${heading[1]} ${heading[2]}`,
    }
  }

  const spacedHeading = beforeCursor.match(/^(\s*#{1,6}\s+)(.*)$/)
  if (spacedHeading) {
    return {
      markerStart: 0,
      continuation: '',
      content: spacedHeading[2],
      normalizePrefix: beforeCursor,
    }
  }

  return null
}

function isInsideFence(value: string, selectionStart: number): boolean {
  const linesBeforeCursor = value.slice(0, selectionStart).split('\n')
  let openFence: string | null = null

  for (const line of linesBeforeCursor) {
    const fence = line.match(FENCE_PATTERN)?.[1]

    if (!fence) continue

    if (openFence === fence) {
      openFence = null
    } else if (!openFence) {
      openFence = fence
    }
  }

  return openFence !== null
}
