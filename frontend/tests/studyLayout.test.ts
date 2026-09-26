import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_VIDEO_RATIO, getPaneBounds, clampPaneRatio, parseStoredPaneRatio, paneRatioFromPointer } from '../src/lib/studyLayout.ts'

test('saved ratios tolerate missing, corrupt and out-of-range values', () => {
  assert.equal(parseStoredPaneRatio('0.7'), 0.7)
  for (const value of [null, '', ' ', 'bad', 'NaN', 'Infinity', '0', '1', '-1', '2']) {
    assert.equal(parseStoredPaneRatio(value), DEFAULT_VIDEO_RATIO)
  }
})
test('minimum pane widths determine when to stack', () => {
  for (const width of [0, -1, 679, NaN, Infinity]) assert.equal(getPaneBounds(width), null)
  const bounds = getPaneBounds(680)!
  assert.equal(bounds.min, 360 / 680)
  assert.equal(bounds.max, 1 - 320 / 680)
  assert.equal(clampPaneRatio(0.58, bounds), bounds.min)
})
test('drag and keyboard ratios clamp to actual split bounds', () => {
  const bounds = getPaneBounds(1000)!
  assert.equal(clampPaneRatio(NaN, bounds), 0.58)
  assert.equal(clampPaneRatio(0.58 + 0.02, bounds), 0.6)
  assert.equal(clampPaneRatio(0.58 + 0.2, bounds), bounds.max)
  assert.equal(clampPaneRatio(0, bounds), bounds.min)
  // 300px offset includes the queue; available space excludes the separator.
  assert.equal(paneRatioFromPointer(880, 300, 1000), 0.58)
  assert.equal(paneRatioFromPointer(100, 300, 1000), bounds.min)
  assert.equal(paneRatioFromPointer(2000, 300, 1000), bounds.max)
  assert.equal(paneRatioFromPointer(1, 0, 0), DEFAULT_VIDEO_RATIO)
  assert.equal(paneRatioFromPointer(NaN, 0, 1000), DEFAULT_VIDEO_RATIO)
})
