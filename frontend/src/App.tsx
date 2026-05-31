import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import PlaylistBrowser from './pages/PlaylistBrowser'
import PlaylistDetail from './pages/PlaylistDetail'
import WatchPage from './pages/WatchPage'
import HiddenPlaylists from './pages/HiddenPlaylists'
import YouTubeCallbackHandler from './components/YouTubeCallbackHandler'
import './index.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<PlaylistBrowser />} />
        <Route path="/playlist/:id" element={<PlaylistDetail />} />
        <Route path="/watch/:videoId" element={<WatchPage />} />
        <Route path="/playlists/hidden" element={<HiddenPlaylists />} />
        <Route path="/youtube/callback" element={<YouTubeCallbackHandler />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
