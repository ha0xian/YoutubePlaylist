import { useMemo } from 'react'
import { extractVideoChapters } from '../lib/videoDetails'
import type { Video } from '../types/playlist'

interface VideoDetailsProps {
  video: Video
  onSeekToTime: (seconds: number) => void
}

export default function VideoDetails({ video, onSeekToTime }: VideoDetailsProps) {
  const chapters = useMemo(() => extractVideoChapters(video.description), [video.description])

  return (
    <details className="video-details">
      <summary>
        <span className="min-w-0">
          <strong>{video.title}</strong>
          <small>{video.channelTitle}</small>
        </span>
        <span className="video-details-toggle" aria-hidden="true">Details</span>
      </summary>
      <div className="video-details-content">
        {chapters.length > 0 ? (
          <section aria-labelledby={`chapters-${video.id}`}>
            <h3 id={`chapters-${video.id}`}>Chapters</h3>
            <div className="video-chapters">
              {chapters.map((chapter) => (
                <button
                  key={`${chapter.seconds}-${chapter.label}`}
                  type="button"
                  onClick={() => onSeekToTime(chapter.seconds)}
                  title={`Jump to ${chapter.timestamp}`}
                >
                  <span>{chapter.timestamp}</span>
                  {chapter.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <section aria-labelledby={`description-${video.id}`}>
          <h3 id={`description-${video.id}`}>Description</h3>
          <p>{video.description.trim() || 'No description is available for this video.'}</p>
        </section>
      </div>
    </details>
  )
}
