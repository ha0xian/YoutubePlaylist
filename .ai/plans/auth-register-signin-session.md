# Plan: auth-register-signin-session

## Goal

Implement first-step app authentication: users can register, sign in, and remain signed in across browser reloads using a persisted app auth token. This step should not yet implement YouTube OAuth, playlist ownership, note persistence, or data scoping beyond exposing the authenticated current user.

## Context

The repository is a Django REST Framework backend plus a Vite React frontend.

- Backend lives in `backend/`.
- Frontend lives in `frontend/`.
- Backend dependencies are listed in `backend/requirements.txt`: Django 6, Django REST Framework, and `django-cors-headers`.
- Backend settings are in `backend/config/settings.py`.
- Backend API routing is `backend/config/urls.py` -> `backend/api/urls.py`.
- Existing backend API currently exposes only `GET /api/` from `backend/api/views.py`.
- Frontend routing is in `frontend/src/App.tsx`.
- Frontend wraps the app in `AuthProvider` from `frontend/src/main.tsx`.
- Protected app routes already use `frontend/src/components/ProtectedRoute.tsx`.
- Auth screens already exist in `frontend/src/pages/AuthPage.tsx`.
- Frontend auth API client already expects these endpoints in `frontend/src/api/auth.ts`:
  - `POST /api/auth/register/`
  - `POST /api/auth/login/`
  - `GET /api/auth/me/`
- Frontend stores a token in `localStorage` under `youtube-playlist-auth-token` and reloads the current user through `/api/auth/me/`.
- Vite dev server proxies `/api` to `http://localhost:8000` in `frontend/vite.config.ts`.
- Product requirements in `docs/project-requirements.md` call for user registration, login, current-user profile endpoint, per-user GUID/UUID, token-based app authentication, and future YouTube OAuth as separate from app login.

Relevant existing frontend behavior:

- `AuthPage` submits username/password for login and username/email/password for registration.
- `AuthProvider` persists the returned token and user in browser state/localStorage.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- `UserMenu` can show current username/email and clear the frontend session.

Backend should match the existing frontend API contract instead of changing the frontend unless small compatibility changes are required.

## Assumptions

- Token-based app authentication is acceptable for the first implementation step.
- Django's built-in `User` model can be used initially.
- Per-user UUID/GUID can be deferred unless it is required before playlist/note models are introduced.
- Logout can remain frontend-only in this step by removing the token from `localStorage`; server-side token revocation is out of scope unless the human asks for it.
- The frontend form shape should remain username-based for sign in.
- The initial auth token may be long-lived so the user stays signed in until logout or token invalidation.

## Open Questions

None.

## Files To Modify

- Path: `backend/config/settings.py`
  - Purpose of change: Enable DRF token authentication.
  - Specific changes:
    - Add `rest_framework.authtoken` to `INSTALLED_APPS`.
    - Add `REST_FRAMEWORK` defaults using `rest_framework.authentication.TokenAuthentication`.
    - Keep default permissions permissive globally or explicitly set auth permissions per view; prefer per-view `IsAuthenticated` for `/auth/me/`.
  - Expected behavior after modification:
    - DRF can create and validate auth tokens.
    - Authenticated endpoints can read `Authorization: Token <token>`.

- Path: `backend/api/views.py`
  - Purpose of change: Add register, login, and current-user API views.
  - Specific functions to modify/add:
    - Keep `api_root` unchanged except if adding auth links is desired.
    - Add `register(request)`.
    - Add `login(request)`.
    - Add `current_user(request)`.
    - Optionally add a small helper such as `auth_response_for_user(user)`.
  - Expected behavior after modification:
    - Register creates a Django user and returns a token plus public user fields.
    - Login validates credentials and returns the existing token plus public user fields.
    - Current-user endpoint returns the authenticated user's public fields when a valid token is supplied.

- Path: `backend/api/urls.py`
  - Purpose of change: Wire auth endpoints.
  - Specific routes to add:
    - `path("auth/register/", views.register, name="auth-register")`
    - `path("auth/login/", views.login, name="auth-login")`
    - `path("auth/me/", views.current_user, name="auth-me")`
  - Expected behavior after modification:
    - Frontend requests in `frontend/src/api/auth.ts` resolve to backend views.

- Path: `backend/api/tests.py`
  - Purpose of change: Add backend coverage for auth behavior.
  - Specific tests to add:
    - Registration creates user and returns token/user payload.
    - Registration rejects duplicate username.
    - Registration rejects duplicate email.
    - Login returns token/user payload for valid credentials.
    - Login rejects invalid credentials.
    - `/auth/me/` rejects unauthenticated requests.
    - `/auth/me/` returns current user for valid token.
  - Expected behavior after modification:
    - Auth behavior is covered by Django test suite.

## Files To Add

- Path: `backend/api/serializers.py`
  - Purpose: Hold DRF serializers for auth inputs and public user response.
  - Expected exports:
    - `UserSerializer`
      - Serializes `id`, `username`, and `email`.
      - Must not expose password, staff status, permissions, or token.
    - `RegisterSerializer`
      - Accepts `username`, `email`, `password`.
      - Validates unique username case-insensitively.
      - Validates unique email case-insensitively.
      - Runs Django password validation.
      - Creates users with `create_user`.
    - `LoginSerializer`
      - Accepts `username`, `password`.
      - Uses Django `authenticate`.
      - Rejects invalid credentials with a clear `detail` error.
      - Rejects inactive users.

## Do Not Touch

- Do not implement YouTube OAuth in this step.
- Do not add playlist, video, or note models in this step.
- Do not implement playlist ownership or note scoping in this step.
- Do not refactor existing frontend playlist pages.
- Do not change frontend route paths.
- Do not change the frontend auth API response contract unless strictly required.
- Do not change public API shapes outside the new `/api/auth/*` endpoints.
- Do not update dependencies unless `rest_framework.authtoken` cannot be used with the existing installed DRF version.
- Do not alter Django admin, database engine, or unrelated settings.
- Do not introduce JWT, OAuth, social login, or Google account linking for this step.

## Function Signatures And Interfaces

Backend response interfaces:

```json
{
  "token": "<token string>",
  "user": {
    "id": 1,
    "username": "example",
    "email": "example@example.com"
  }
}
```

`POST /api/auth/register/`

- Request body:

```json
{
  "username": "example",
  "email": "example@example.com",
  "password": "A strong password 123"
}
```

- Response `200 OK` or `201 Created`:
  - Must include `token` and `user`.
- Validation behavior:
  - Missing fields return `400`.
  - Duplicate username returns `400` with `username` error.
  - Duplicate email returns `400` with `email` error.
  - Weak passwords return `400` with `password` error.
- Side effects:
  - Creates a new `User`.
  - Creates or returns a DRF token for that user.

`POST /api/auth/login/`

- Request body:

```json
{
  "username": "example",
  "password": "A strong password 123"
}
```

- Response `200 OK`:
  - Must include `token` and `user`.
- Error behavior:
  - Invalid credentials return `400` with a `detail` message.
  - Inactive users return `400` with a `detail` message.
- Side effects:
  - Does not create a new user.
  - Creates a token only if one does not already exist.

`GET /api/auth/me/`

- Request headers:

```text
Authorization: Token <token string>
```

- Response `200 OK`:

```json
{
  "id": 1,
  "username": "example",
  "email": "example@example.com"
}
```

- Error behavior:
  - Missing or invalid token returns `401`.
- Side effects:
  - None.

Frontend interface constraints:

- `frontend/src/api/auth.ts` should continue to export:
  - `login(credentials: AuthCredentials): Promise<AuthResponse>`
  - `register(credentials: RegisterCredentials): Promise<AuthResponse>`
  - `getCurrentUser(token: string): Promise<AuthUser>`
- `AuthResponse` must remain `{ token: string; user: AuthUser }`.
- `AuthUser` must remain `{ id: number; username: string; email: string }`.

## Implementation Steps

1. Add `rest_framework.authtoken` to `INSTALLED_APPS` in `backend/config/settings.py`.
2. Configure DRF token authentication in `REST_FRAMEWORK`.
3. Create `backend/api/serializers.py` with `UserSerializer`, `RegisterSerializer`, and `LoginSerializer`.
4. Add an auth response helper in `backend/api/views.py` that returns the token and serialized user.
5. Add `register` view:
   - Validate request with `RegisterSerializer`.
   - Save user with `create_user`.
   - Return token/user payload.
6. Add `login` view:
   - Validate request with `LoginSerializer`.
   - Return token/user payload for the authenticated user.
7. Add `current_user` view:
   - Require `IsAuthenticated`.
   - Return `UserSerializer(request.user).data`.
8. Wire the three auth routes in `backend/api/urls.py`.
9. Add tests in `backend/api/tests.py` for successful and failed auth flows.
10. Run backend migrations so the token table exists:
    - `python manage.py migrate`
11. Run backend tests:
    - `python manage.py test api`
12. Run frontend build:
    - `npm run build` from `frontend/`
13. Manually smoke test:
    - Start Django on port 8000.
    - Start Vite frontend.
    - Register a user.
    - Confirm redirect into protected app.
    - Reload browser and confirm the session remains signed in.
    - Logout and confirm protected routes redirect to login.

## Acceptance Criteria

- A new user can register from the frontend.
- Successful registration stores an app auth token in `localStorage`.
- Successful registration redirects into the protected app.
- An existing user can sign in from the frontend.
- Successful sign-in stores an app auth token in `localStorage`.
- Reloading the browser calls `/api/auth/me/` and keeps the user signed in when the token is valid.
- Invalid or missing token clears the frontend session and redirects protected routes to `/login`.
- `/api/auth/me/` returns only `id`, `username`, and `email`.
- Passwords are never returned by any auth endpoint.
- Invalid login credentials show a clear error in the existing auth form.
- Duplicate usernames and duplicate emails are rejected.
- Backend auth tests pass.
- Frontend build passes.

## Testing Requirements

- Test file to modify:
  - `backend/api/tests.py`
- Required backend test cases:
  - `test_register_creates_user_and_returns_token`
  - `test_register_rejects_duplicate_username`
  - `test_register_rejects_duplicate_email`
  - `test_register_rejects_weak_password`
  - `test_login_returns_existing_user_token`
  - `test_login_rejects_invalid_credentials`
  - `test_current_user_requires_token`
  - `test_current_user_returns_authenticated_user`
- Commands to run:
  - `python manage.py migrate`
  - `python manage.py test api`
  - `npm run build`
- Expected passing result:
  - Django test suite reports all auth tests passing.
  - Frontend TypeScript/Vite build completes without errors.
- Out of scope tests:
  - Playlist ownership tests.
  - Notes scoping tests.
  - YouTube OAuth tests.
  - End-to-end browser automation unless Agent B has time and the dev servers are available.

## Edge Cases

- Duplicate username with different letter casing.
- Duplicate email with different letter casing.
- Missing username, email, or password on registration.
- Missing username or password on login.
- Weak password rejected by Django validators.
- Login with wrong password.
- Login for inactive user.
- `/auth/me/` with no token.
- `/auth/me/` with malformed token.
- `/auth/me/` with token for a deleted user.

## Risks

- DRF token auth requires the `authtoken_token` database table, so migrations must be run.
- Long-lived tokens are convenient for the first step but should be revisited for production security.
- `CORS_ALLOW_ALL_ORIGINS = True` is development-friendly but not production-safe.
- Frontend-only logout does not revoke the backend token.
- Django's default `User` model does not include the per-user UUID/GUID called out in requirements; adding that later may require a profile model or a custom user model decision.
- If the frontend and backend run on different domains in production, token storage and CORS settings need a stricter deployment configuration.

## Out Of Scope

- YouTube account linking.
- Google OAuth.
- Playlist import.
- Playlist visibility filtering by user.
- Note persistence and note scoping.
- Server-side logout/token revocation.
- Password reset.
- Email verification.
- User profile editing.
- Custom user model migration.
- Production deployment hardening.

## Done Definition

- Auth endpoints are implemented and match the frontend's existing API contract.
- Backend migrations have been run locally.
- Backend auth tests pass.
- Frontend build passes.
- Manual smoke test confirms register, sign in, reload persistence, and logout behavior.
- No unrelated files or product areas were changed.
- Any deviations from this plan are documented before handoff.
