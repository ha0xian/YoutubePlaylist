import { Routes, Route, Navigate } from 'react-router-dom'
import PlaylistBrowser from './pages/PlaylistBrowser'
import PlaylistDetail from './pages/PlaylistDetail'
import WatchPage from './pages/WatchPage'
import './index.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaylistBrowser />} />
      <Route path="/playlist/:id" element={<PlaylistDetail />} />
      <Route path="/watch/:videoId" element={<WatchPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
