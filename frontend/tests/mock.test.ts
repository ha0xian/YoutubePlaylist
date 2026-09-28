import test from 'node:test'
import assert from 'node:assert/strict'
import { mockFetch } from '../src/api/mock.ts'

test('mock library supports details, imports, unlinking and missing playlists', async () => {
  const list = await (await mockFetch('/api/playlists/')).json()
  assert.ok(list.length >= 2)
  const detail = await (await mockFetch(`/api/playlists/${list[0].id}/`)).json()
  assert.ok(detail.videos.length > 0)
  assert.equal((await mockFetch('/api/playlists/999/')).status, 404)
  assert.equal((await mockFetch('/api/playlists/import/', { method: 'POST', body: JSON.stringify({ url: 'bad' }) })).status, 400)
  const imported = await (await mockFetch('/api/playlists/import/', { method: 'POST', body: JSON.stringify({ url: 'https://www.youtube.com/playlist?list=test-fixture' }) })).json()
  assert.equal(imported.youtubePlaylistId, 'test-fixture')
  await mockFetch(`/api/playlists/${imported.id}/unlink/`, { method: 'POST' })
  const updated = await (await mockFetch('/api/playlists/')).json()
  assert.ok(!updated.some((item: { id: number }) => item.id === imported.id))
})

test('mock notes and AI settings round-trip, and aborted writes do not save', async () => {
  const path = '/api/notes/test-video/'
  const content = '# My note'
  await mockFetch(path, { method: 'PUT', body: JSON.stringify({ content }) })
  assert.equal((await (await mockFetch(path)).json()).content, content)
  const noteList = await (await mockFetch('/api/notes/')).json()
  assert.ok(noteList.some((note: { youtubeVideoId: string }) => note.youtubeVideoId === 'test-video'))
  assert.equal(noteList.find((note: { youtubeVideoId: string }) => note.youtubeVideoId === 'W6NZfCO5SIk').videoTitle, 'JavaScript fundamentals')
  await assert.rejects(mockFetch(path, { method: 'PUT', body: JSON.stringify({ content: 'Canceled' }), signal: AbortSignal.abort() }), { name: 'AbortError' })
  assert.equal((await (await mockFetch(path)).json()).content, content)
  await mockFetch('/api/ai/settings/', { method: 'PUT', body: JSON.stringify({ default_prompt: 'Practice questions' }) })
  assert.equal((await (await mockFetch('/api/ai/settings/')).json()).defaultPrompt, 'Practice questions')
  const result = await (await mockFetch('/api/videos/test-video/analyze/', { method: 'POST' })).json()
  assert.match(result.content, /Mock AI analysis/)
})

test('unsupported requests fail locally instead of contacting services', async () => {
  assert.equal((await mockFetch('/api/unknown/')).status, 404)
  const oauth = await mockFetch('/api/youtube/auth-url/')
  assert.equal(oauth.status, 400)
  assert.match((await oauth.json()).detail, /unavailable in mock mode/)
})
