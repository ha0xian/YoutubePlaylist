# AGENTS.md

Operational guide for agents working in this repository.

## Project Snapshot

This repo is a YouTube playlist viewer prototype with a Django REST Framework
backend and a Vite + React + TypeScript frontend.

Current checkout state:

- `backend/` is a minimal Django 6 project with DRF and CORS installed. It
  exposes a single hello-world API root at `/api/`.
- `frontend/` is a React 19 app with protected routes, auth context, playlist
  browsing, playlist detail, a watch page, YouTube iframe playback, markdown
  notes, and mock playlist data.
- `docs/features.md` and files under `plan/` describe a broader planned product
  state. Treat those as planning references, not as proof that files or
  endpoints already exist in this checkout.

Important local mismatch: the frontend auth client calls `/api/auth/login/`,
`/api/auth/register/`, and `/api/auth/me/`, but the backend currently only
defines `/api/`. Login/register flows will not work until the backend auth
endpoints are implemented.

## Repository Layout

- `backend/manage.py` - Django entrypoint.
- `backend/config/settings.py` - Django settings. Uses SQLite, `DEBUG = True`,
  wildcard CORS, and a hard-coded development secret key.
- `backend/config/urls.py` - Routes `admin/` and `api/`.
- `backend/api/views.py` - DRF function view for the API root.
- `backend/api/urls.py` - API URL declarations.
- `frontend/package.json` - frontend scripts and dependency manifest.
- `frontend/vite.config.ts` - Vite config with React, Tailwind plugin, and
  `/api` proxy to `http://localhost:8000`.
- `frontend/src/App.tsx` - route tree.
- `frontend/src/auth/` - auth context/provider/hooks and localStorage token
  handling.
- `frontend/src/api/auth.ts` - fetch wrapper and auth API calls.
- `frontend/src/data/mockData.ts` - current playlist/video source for UI pages.
- `frontend/src/pages/` - login/register, playlist browser/detail, watch page.
- `frontend/src/components/` - UI pieces for player, notes, menus, cards, and
  route protection.
- `docs/` and `plan/` - product notes and implementation plans.
- `qa_screenshots/` - local visual QA artifacts.

## Architecture

Backend:

- Django 6 project under `backend/config`.
- DRF is installed and used for JSON responses.
- CORS middleware is installed and currently allows all origins for local
  development.
- Database is SQLite at `backend/db.sqlite3` when migrations are run locally.
- There are no domain models yet in the checked-out backend.

Frontend:

- Vite app using React 19, TypeScript, React Router, `marked`, and Tailwind CSS
  classes.
- Routes:
  - `/login` and `/register` render `AuthPage`.
  - `/`, `/playlist/:id`, and `/watch/:videoId` sit behind `ProtectedRoute`.
  - unknown paths redirect to `/`.
- Auth state is stored in React context and persisted via `localStorage` using
  `TOKEN_STORAGE_KEY`.
- API requests use `VITE_API_BASE_URL` when set; otherwise relative `/api/...`
  paths are proxied by Vite during development.
- Playlist pages currently read from `frontend/src/data/mockData.ts`.
- Notes currently render markdown with `marked`; verify whether a note change is
  local-only before assuming backend persistence exists.

## Coding Standards

General:

- Keep changes scoped. The repo has planned features that are not implemented;
  avoid adding broad architecture unless a task specifically calls for it.
- Prefer existing file organization and naming over introducing new layers.
- Use ASCII unless a touched file already requires non-ASCII text.
- Do not commit generated artifacts such as `node_modules/`, `dist/`,
  `db.sqlite3`, virtualenvs, or screenshots unless explicitly requested.

Backend:

- Follow standard Django app boundaries: models in `api/models.py`, serializers
  in `api/serializers.py`, views in `api/views.py`, URL wiring in `api/urls.py`,
  admin registration in `api/admin.py`.
- Prefer DRF serializers/viewsets for CRUD APIs once models are introduced.
- Scope user-owned data by authenticated user in `get_queryset()` or equivalent
  view logic.
- Keep secrets and deployment settings out of source. Move production
  `SECRET_KEY`, OAuth credentials, CORS origins, allowed hosts, and database
  configuration to environment variables before deployment.
- Add migrations whenever models change.

Frontend:

- Use function components and hooks.
- Keep shared auth behavior in `frontend/src/auth/` and API fetch helpers in
  `frontend/src/api/`.
- Keep route-level screens in `frontend/src/pages/`; keep reusable UI in
  `frontend/src/components/`.
- Type API/domain shapes in `frontend/src/types/`.
- Use existing dark YouTube-like visual language: `#0f0f0f` background,
  restrained borders, white/gray text, red accent where appropriate.
- The project uses Tailwind-style utility classes. If Tailwind/Vite plugin
  dependencies are adjusted, keep `vite.config.ts`, `index.css`, and
  `package.json` in sync.
- Avoid inline SVG for common controls if an icon library is added later; use
  that library consistently.

## Local Development

Backend setup:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

If PowerShell cannot find `python`, install Python or use the launcher available
on the machine, for example `py -m venv venv`.

Frontend setup:

```powershell
cd frontend
npm install
npm.cmd run dev
```

Use `npm.cmd` from PowerShell on Windows if script execution policy blocks
`npm.ps1`.

Local app URLs:

- Backend API: `http://localhost:8000/api/`
- Django admin: `http://localhost:8000/admin/`
- Frontend dev server: Vite prints the exact localhost URL, usually
  `http://localhost:5173/`.

## Testing and Verification

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py test
python manage.py check
```

Run `python manage.py check --deploy` when touching deployment-sensitive
settings. Expect warnings until production settings are split from development
settings.

Frontend:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

Current observed verification on this checkout:

- `npm.cmd run lint` passes.
- `npm.cmd run build` fails locally under the current workspace path
  `Youtube playlist` with a Vite/Rolldown emitted asset path error involving
  `frontend/index.html`. Recheck after moving to a path without spaces or after
  adjusting Vite/Rolldown versions/config.
- Backend tests could not be run in the default shell because no Python/Django
  environment was active. The bundled Codex Python lacks Django; use a project
  virtualenv with `backend/requirements.txt`.

Manual smoke checks after functional changes:

- Visit `/api/` and confirm JSON response from Django.
- Start both servers and confirm the Vite proxy reaches `localhost:8000`.
- Exercise login/register only after backend auth endpoints exist.
- For frontend UI changes, verify `/`, `/playlist/:id`, and `/watch/:videoId`
  at desktop and narrow widths.

## Deployment Procedure

There is no deployment automation in this checkout. Use this as the minimum
manual production checklist.

Backend preparation:

1. Create production settings or environment-based settings.
2. Set `DEBUG = False`.
3. Move `SECRET_KEY` to an environment variable and rotate the committed
   development key.
4. Set `ALLOWED_HOSTS` to the real hostnames.
5. Replace `CORS_ALLOW_ALL_ORIGINS = True` with explicit trusted origins.
6. Configure a production database instead of local SQLite if needed.
7. Run `python manage.py migrate`.
8. Run `python manage.py collectstatic` after static files are configured.
9. Run `python manage.py check --deploy`.
10. Serve Django through a production WSGI/ASGI server such as gunicorn,
    uvicorn, or the platform's managed Python runtime.

Frontend preparation:

1. Set `VITE_API_BASE_URL` to the deployed backend origin when the frontend and
   backend are hosted separately.
2. Run `npm.cmd run lint`.
3. Run `npm.cmd run build`.
4. Deploy `frontend/dist/` to the static hosting target.
5. Configure SPA fallback to `index.html` for React Router routes.

Post-deploy smoke checks:

- Confirm frontend loads over HTTPS.
- Confirm API calls target the production backend.
- Confirm CORS allows the deployed frontend origin only.
- Confirm auth-protected routes and any newly implemented API endpoints behave
  correctly.

## Known Gaps and Cautions

- Backend auth endpoints are planned but not implemented in this checkout.
- Backend playlist/video/note models and CRUD APIs are not implemented in this
  checkout.
- YouTube OAuth, YouTube Data API sync, token encryption, and Gemini integration
  are planning items unless added in a later branch.
- `frontend/vite.config.ts` imports `@tailwindcss/vite`; ensure
  `tailwindcss` and `@tailwindcss/vite` are present in `package.json` whenever
  dependencies are refreshed.
- `docs/features.md` contains references to files that are absent locally. Use
  `rg --files` and source inspection as the source of truth.
