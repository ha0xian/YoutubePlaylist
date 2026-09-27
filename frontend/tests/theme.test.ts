import test from 'node:test'
import assert from 'node:assert/strict'
import { parseThemePreference, resolveTheme, readThemePreference, writeThemePreference } from '../src/lib/theme.ts'

test('preference parsing and OS resolution', () => {
  for (const value of [null, '', 'broken', 'DARK']) assert.equal(parseThemePreference(value), 'system')
  assert.equal(parseThemePreference('light'), 'light')
  assert.equal(parseThemePreference('dark'), 'dark')
  for (const systemDark of [true, false]) {
    assert.equal(resolveTheme('light', systemDark), 'light')
    assert.equal(resolveTheme('dark', systemDark), 'dark')
    assert.equal(resolveTheme('system', systemDark), systemDark ? 'dark' : 'light')
  }
})
test('storage is optional and failures never escape', () => {
  const storage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  assert.equal(readThemePreference(null), 'system')
  assert.equal(readThemePreference(storage), 'system')
  assert.doesNotThrow(() => writeThemePreference(storage, 'dark'))
  assert.doesNotThrow(() => writeThemePreference(null, 'light'))
  let saved = ''
  writeThemePreference({ setItem(key, value) { assert.equal(key, 'yt-study:theme'); saved = value } }, 'dark')
  assert.equal(readThemePreference({ getItem() { return saved } }), 'dark')
})
