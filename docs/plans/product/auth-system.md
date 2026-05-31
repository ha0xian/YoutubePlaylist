---
mode: extend
target: backend/api
---

# Auth System

## Goal
Deliver backend auth endpoints that allow users to register and sign in with email + password, returning a token that the existing frontend can consume. Each user is identified by a UUID (GUID) for external reference.

The frontend auth UI (login/register pages, protected routes, user menu, token persistence) is already built and committed. This plan covers only the missing backend layer.

## Users
- Site visitor — registers with email + password to create an account, then signs in to access protected content
- Returning user — signs in with credentials to resume session

## Acceptance criteria
- [ ] User can register via `POST /api/auth/register/` with `{ username, email, password }` and receive `{ token, user }` (with `user` containing `id`, `uuid`, `username`, `email`)
- [ ] User can sign in via `POST /api/auth/login/` with `{ username, password }` or `{ email, password }` and receive `{ token, user }`
- [ ] Authenticated user can fetch their profile via `GET /api/auth/me/` with a valid `Authorization: Token <token>` header and receive `{ id, uuid, username, email }`
- [ ] Invalid credentials return a clear error message (e.g., 401 with `{ "detail": "..." }`)
- [ ] Registering with an already-used username or email returns a validation error
- [ ] Passwords are validated against Django's default password validators (min length, not too common, not too similar to user attributes)
- [ ] Each user record has a UUID (`user.uuid`) that is unique and generated on creation
- [ ] Existing frontend login/register flows function end-to-end with the new backend endpoints without frontend changes (except type updates for UUID)

## Scope
- **In:**
  - Django User model extended with a UUID field
  - DRF serializers for registration and login
  - Registration endpoint (`POST /api/auth/register/`)
  - Login endpoint (`POST /api/auth/login/`)
  - Current-user endpoint (`GET /api/auth/me/`)
  - DRF TokenAuthentication setup (`rest_framework.authtoken`)
  - CORS and URL routing wiring
  - Backend unit tests for all three endpoints
  - Frontend type update: `AuthUser.id` stays as number; add `AuthUser.uuid` as string
- **Out:**
  - Email verification / confirmation flow
  - Password reset / "forgot password"
  - OAuth / social login
  - Rate limiting on auth endpoints
  - Admin user management UI (Django admin is already available but out of scope for this plan)
  - Refresh token rotation (tokens are long-lived as per DRF default)

## Non-functional
- **Security**: Passwords hashed via Django's `PBKDF2PasswordHasher` (default). Token stored server-side in `authtoken` table.
- **Observability**: Auth failures return structured error responses (DRF default).
- **Backward compatibility**: Existing frontend `AuthUser.id` (number) preserved; `uuid` added as new field. Frontend `api/auth.ts` types updated but logic unchanged.

## Open questions
- **Login identifier**: Spec says "email + password" but existing frontend sends `username` + `password`. Plan assumes both username and email are accepted for login (flexible auth). Confirm preferred approach.
- **UUID vs integer PK**: Spec requires GUID userID. Plan adds a UUID field alongside Django's integer PK. Confirm whether the integer PK should be replaced entirely (breaking change for frontend) or kept alongside.
- **Token lifetime**: DRF `authtoken` tokens are permanent by default. Confirm whether tokens should expire or have a configurable TTL.
