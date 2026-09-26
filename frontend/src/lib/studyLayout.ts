export interface PaneBounds { min: number; max: number }
export const DEFAULT_VIDEO_RATIO = 0.58
export const MIN_VIDEO_WIDTH = 360
export const MIN_NOTES_WIDTH = 320
export const SEPARATOR_WIDTH = 12

export function getPaneBounds(availableWidth: number): PaneBounds | null {
  if (!Number.isFinite(availableWidth) || availableWidth < MIN_VIDEO_WIDTH + MIN_NOTES_WIDTH) return null
  return { min: MIN_VIDEO_WIDTH / availableWidth, max: 1 - MIN_NOTES_WIDTH / availableWidth }
}

export function clampPaneRatio(ratio: number, bounds: PaneBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, Number.isFinite(ratio) ? ratio : DEFAULT_VIDEO_RATIO))
}

export function parseStoredPaneRatio(value: string | null): number {
  const ratio = value?.trim() ? Number(value) : NaN
  return Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : DEFAULT_VIDEO_RATIO
}

export function paneRatioFromPointer(clientX: number, containerLeft: number, availableWidth: number): number {
  const bounds = getPaneBounds(availableWidth)
  return bounds && Number.isFinite(clientX) && Number.isFinite(containerLeft)
    ? clampPaneRatio((clientX - containerLeft) / availableWidth, bounds)
    : DEFAULT_VIDEO_RATIO
}
