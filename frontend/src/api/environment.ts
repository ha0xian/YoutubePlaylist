// Vite replaces DEV with false in production, even if the mock flag is enabled.
export const USE_MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA !== 'false'

export const MOCK_SESSION = {
  token: 'local-mock-session',
  user: { id: 0, username: 'Local demo', email: 'demo@example.test' },
}
