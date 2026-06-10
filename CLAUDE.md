# Youtube Playlist — Project Instructions

## YouTube API

- **Always consult the YouTube Data API v3 documentation** when working with YouTube API calls, quotas, error codes, or response shapes: https://developers.google.com/youtube/v3/docs
- Key endpoints used in this project:
  - `playlists.list` — playlist metadata (snippet, contentDetails)
  - `playlistItems.list` — paginated playlist items
  - `videos.list` — video details in batches of up to 50 IDs
- Batching and pagination details differ across endpoints; check the docs before changing pagination or parameter logic.
- The API key is loaded from `YOUTUBE_API_KEY` environment variable (via `backend/.env`).

## Project Structure

- **Backend:** Django REST Framework in `backend/`
  - Token-based auth (register, login, current-user)
  - SQLite database (`backend/db.sqlite3`)
  - Run: `python manage.py runserver`
  - Test: `python manage.py test api`
  - Migrate: `python manage.py migrate`
  - **After any model change (adding/removing/altering fields), always run `python manage.py migrate`** to apply migrations to the development database. If the migration fails, fix the migration file before proceeding — an unmigrated model change will crash the running server.
- **Frontend:** React + Vite + TypeScript in `frontend/`
  - Run: `npm run dev`
  - Build: `npm run build`
  - Lint: `npm run lint`

## Plans & State

- Plans live at `.ai/plans/<branch-name>.md`
- State files live at `.ai/state/<branch-name>.json`
- Read the matching plan before implementing on a feature branch.
