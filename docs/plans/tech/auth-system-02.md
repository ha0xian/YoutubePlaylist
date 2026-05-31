---
feature: auth-system
slice: 02
area: backend
mode: extend
parallel-safe-with: [auth-system-03]
---

# Backend auth API: serializers, views, URL routing, and tests

## Goal

Implement `POST /api/auth/register/`, `POST /api/auth/login/`, and `GET /api/auth/me/` endpoints with DRF serializers and views, plus unit tests for all three.

## Files

- `backend/api/serializers.py` (new) -- RegistrationSerializer, LoginSerializer, UserSerializer
- `backend/api/views.py` (extend) -- RegisterView, LoginView, MeView
- `backend/api/urls.py` (extend) -- wire auth/register, auth/login, auth/me routes
- `backend/api/tests.py` (extend) -- test register, login, me

## Interfaces

### Serializers

**RegistrationSerializer** (serializers.Serializer)
- Fields: `username` (CharField, max_length=150, validators=[UniqueValidator(User.objects.all(), ...)]), `email` (EmailField, validators=[UniqueValidator(...)]), `password` (CharField, write_only, style={'input_type': 'password'})
- `validate_password`: run Django's password validators (`django.contrib.auth.password_validation.validate_password`)
- `create(validated_data)`: create User via `User.objects.create_user(...)`, then get-or-create UserProfile (auto-created by signal), create Token via `Token.objects.create(user=user)`, return a dict with `token`, `user` (including `user.id`, `user.profile.uuid`, `user.username`, `user.email`)

**LoginSerializer** (serializers.Serializer)
- Fields: `username` (CharField, required=False), `email` (EmailField, required=False), `password` (CharField, write_only, style={'input_type': 'password'})
- Validation: at least one of `username` or `email` must be provided. Try authenticating via `authenticate(request=None, username=...)` if username provided, else `User.objects.get(email=...)` and then check password manually.
- If credentials invalid, raise `serializers.ValidationError({"detail": "Unable to log in with provided credentials."})`
- On success, return `{ "token": Token.objects.get_or_create(user=user)[0].key, "user": { id, uuid, username, email } }`

**UserSerializer** (serializers.ModelSerializer)
- Model: User
- Fields: `id`, `uuid` (from user.profile.uuid, via SerializerMethodField), `username`, `email`

### Views (all use `@api_view` or APIView)

**RegisterView** -- `POST /api/auth/register/`
- Request body: `{ username, email, password }`
- Response 201: `{ token: string, user: { id, uuid, username, email } }`
- Response 400: validation errors per field

**LoginView** -- `POST /api/auth/login/`
- Request body: `{ username, password }` OR `{ email, password }`
- Response 200: `{ token: string, user: { id, uuid, username, email } }`
- Response 401: `{ "detail": "Unable to log in with provided credentials." }`

**MeView** -- `GET /api/auth/me/`
- Authentication: TokenAuthentication (enforced via `@authentication_classes` + `@permission_classes([IsAuthenticated])`)
- Response 200: `{ id, uuid, username, email }`
- Response 401: if no valid token

### URL routing

Add to `backend/api/urls.py`:

```python
urlpatterns = [
    path("", views.api_root, name="api-root"),
    path("auth/register/", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
]
```

### Tests (`backend/api/tests.py`)

Use Django's `APITestCase` from `rest_framework.test`.

**TestRegister**
- Register with valid data -> 201, response has `token` and `user` (with `id`, `uuid`, `username`, `email`)
- Register with duplicate username -> 400 with validation error
- Register with duplicate email -> 400 with validation error
- Register with weak password -> 400 with validation error

**TestLogin**
- Login with correct username+password -> 200, response has `token` and `user`
- Login with correct email+password -> 200, response has `token` and `user`
- Login with wrong password -> 401 with `{ "detail": "..." }`
- Login with non-existent username -> 401

**TestMe**
- GET /api/auth/me/ with valid token -> 200, returns `{ id, uuid, username, email }`
- GET /api/auth/me/ without token -> 401
- GET /api/auth/me/ with invalid token -> 401

## Acceptance

- [ ] `POST /api/auth/register/` with `{ username, email, password }` returns 201 with `{ token, user }`
- [ ] `POST /api/auth/login/` with `{ username, password }` or `{ email, password }` returns 200 with `{ token, user }`
- [ ] `GET /api/auth/me/` with `Authorization: Token <token>` returns 200 with user object
- [ ] Invalid credentials return 401 with `{ "detail": "Unable to log in with provided credentials." }`
- [ ] Duplicate username/email returns 400 with field-level validation errors
- [ ] All tests pass via `cd backend && python manage.py test`

## Tests

Covered in the "Tests" section above. All test cases live in `backend/api/tests.py`.

## Size

M

## Security

### Findings (add to plan)

1. **Login error message must not leak which field is incorrect.** The plan says to return `"Unable to log in with provided credentials."` -- this is correct. Ensure the serializer does NOT differentiate between "username not found", "email not found", and "wrong password" in the error response. All three cases should produce the same generic message to prevent user enumeration.

2. **Registration error messages can leak existing accounts.** Returning field-level validation errors for duplicate username/email is acceptable and expected UX, but be aware that this allows an attacker to probe whether an email is registered. This is a design trade-off acknowledged as in-scope by the product plan. No change needed.

3. **Email-based login path must guard against timing attacks.** When looking up a user by email, use a single query that fetches the user by email and checks the password hash in one logical step, rather than a two-step "check email exists, then check password" pattern. The plan's description (`authenticate` for username, manual lookup for email) should be implemented so that when the email does not match any user, the password comparison still runs against a dummy hash to keep response time constant. Use `django.contrib.auth.hashers.check_password` against a dummy hash when user not found.

4. **Token creation uses `get_or_create`.** DRF authtoken's `Token.objects.get_or_create(user=user)` creates a token on first login and reuses it on subsequent logins. This means tokens are long-lived with no rotation. The product plan declares this out of scope, but flag that if a token is leaked, it grants access until manually deleted from the DB. Consider documenting a manual token-revoke procedure for operators.

5. **No rate limiting on auth endpoints.** The product plan explicitly marks rate limiting as out of scope, but note that production deployment should add throttling to `/api/auth/login/` (e.g., DRF's `AnonRateThrottle`) to mitigate brute-force attacks. Not a blocker for this slice.

6. **MeView must enforce authentication.** The plan correctly calls for `IsAuthenticated`. Ensure it is applied via `permission_classes([IsAuthenticated])` on the view, not omitted accidentally.
