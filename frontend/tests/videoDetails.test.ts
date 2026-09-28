import test from 'node:test'
import assert from 'node:assert/strict'
import { extractVideoChapters, timestampToSeconds } from '../src/lib/videoDetails.ts'

test('timestamps convert to seconds and reject invalid clock values', () => {
  assert.equal(timestampToSeconds('1:25'), 85)
  assert.equal(timestampToSeconds('75:00'), 4500)
  assert.equal(timestampToSeconds('1:02:03'), 3723)
  assert.equal(timestampToSeconds('1:60'), null)
  assert.equal(timestampToSeconds('not-a-time'), null)
})

test('chapter lines are extracted without treating arbitrary timestamps as chapters', () => {
  const chapters = extractVideoChapters('Overview\n0:00 Introduction\n- 1:20 First topic\nAt 2:00 we discuss this\n1:20 Duplicate\n01:02:03 Long lesson')
  assert.deepEqual(chapters, [
    { timestamp: '0:00', label: 'Introduction', seconds: 0 },
    { timestamp: '1:20', label: 'First topic', seconds: 80 },
    { timestamp: '01:02:03', label: 'Long lesson', seconds: 3723 },
  ])
})
