import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

for (const [name, dev, flag, expected] of [
  ['development defaults to mocks', true, undefined, true],
  ['development can opt into the real API', true, 'false', false],
  ['production ignores an enabled mock flag', false, 'true', false],
]) {
  test(name, async () => {
    const server = await createServer({
      configFile: false,
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { middlewareMode: true, watch: null },
      define: {
        'import.meta.env.DEV': JSON.stringify(dev),
        'import.meta.env.VITE_USE_MOCK_DATA': flag === undefined ? 'undefined' : JSON.stringify(flag),
      },
    })
    const originalFetch = globalThis.fetch
    let requests = 0
    globalThis.fetch = async () => {
      requests++
      return Response.json([])
    }
    try {
      const { USE_MOCK_DATA } = await server.ssrLoadModule('/src/api/environment.ts')
      assert.equal(USE_MOCK_DATA, expected)
      const { listPlaylists, getPlaylist } = await server.ssrLoadModule('/src/api/playlists.ts')
      const items = await listPlaylists('test-session')
      if (expected) {
        assert.ok(items.length > 0)
        assert.ok((await getPlaylist('test-session', items[0].id)).videos.length > 0)
        assert.equal(requests, 0)
      } else {
        assert.deepEqual(items, [])
        assert.equal(requests, 1)
      }
    } finally {
      globalThis.fetch = originalFetch
      await server.close()
    }
  })
}
