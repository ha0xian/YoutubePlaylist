import YouTubePlayer from './components/YouTubePlayer'
import MarkdownNotes from './components/MarkdownNotes'
import './App.css'

function App() {
  return (
    <div className="app">
      <div className="video-panel">
        <YouTubePlayer />
      </div>
      <div className="notes-panel">
        <MarkdownNotes />
      </div>
    </div>
  )
}

export default App
