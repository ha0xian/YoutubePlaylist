export interface VideoChapter {
  label: string
  seconds: number
  timestamp: string
}

const CHAPTER_LINE = /^\s*(?:[-*•]\s*)?((?:\d+:)?\d{1,2}:\d{2})\s+(.+?)\s*$/

export function timestampToSeconds(timestamp: string): number | null {
  const parts = timestamp.split(':').map(Number)
  if ((parts.length !== 2 && parts.length !== 3) || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return null
  }
  const [hours, minutes, seconds] = parts.length === 3 ? parts : [0, parts[0], parts[1]]
  if ((parts.length === 3 && minutes >= 60) || seconds >= 60) return null
  return hours * 3600 + minutes * 60 + seconds
}

export function extractVideoChapters(description: string): VideoChapter[] {
  const chapters: VideoChapter[] = []
  const seenSeconds = new Set<number>()

  for (const line of description.split(/\r?\n/)) {
    const match = line.match(CHAPTER_LINE)
    if (!match) continue
    const seconds = timestampToSeconds(match[1])
    if (seconds === null || seenSeconds.has(seconds)) continue
    seenSeconds.add(seconds)
    chapters.push({ timestamp: match[1], label: match[2], seconds })
  }

  return chapters
}
