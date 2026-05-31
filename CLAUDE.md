## Stack

<!-- init-team-version: 2 -->

- Language: TypeScript (frontend) + Python (backend)
- Framework: React/Vite (frontend) + Django/DRF (backend)
- Package manager: npm (frontend) + pip (backend)
- Lint/format: `cd frontend && npx eslint .` (frontend) | `cd backend && ruff check .` (backend)
- Typecheck/build: `cd frontend && npx tsc -b && npm run build` (frontend) | `cd backend && pyright .` (backend)
- Tests: use the `test-runner` skill (base frontend: `cd frontend && npx vitest run`; base backend: `cd backend && python manage.py test`)
- Run (for /verify): Terminal 1: `cd backend && python manage.py runserver` — Terminal 2: `npm run dev --prefix frontend`
- PR platform: github
