---
feature: auth-system
slice: 01
area: backend
mode: extend
parallel-safe-with: [auth-system-03]
---

# Backend foundation: User model extension + auth plumbing

## Goal

Add a UserProfile model with a UUID field linked to Django's User model, register it in admin, install and configure DRF Token auth, and create the database migration.

## Files

- `backend/api/models.py` (extend) -- add UserProfile model
- `backend/api/admin.py` (extend) -- register UserProfile in admin
- `backend/config/settings.py` (extend) -- add `rest_framework.authtoken` to INSTALLED_APPS, add REST_FRAMEWORK default auth/permission config
- `backend/api/apps.py` (extend) -- add ready() method to ApiConfig to register signals

## Interfaces

### Model: `UserProfile`

| Field | Type | Notes |
|-------|------|-------|
| `user` | OneToOneField(User, on_delete=models.CASCADE, related_name='profile') | Primary key |
| `uuid` | UUIDField(default=uuid.uuid4, unique=True, editable=False) | Externally-facing user identifier |

Add a `__str__` returning `f"{self.user.username} ({self.uuid})"`.

### Signal handler

Connect `post_save` on `django.contrib.auth.models.User` to auto-create a `UserProfile` with a new UUID whenever a User is created.

### Settings additions

In `INSTALLED_APPS`, add `'rest_framework.authtoken'`.

Add a new `REST_FRAMEWORK` dict:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}
```

## Acceptance

- [ ] `python manage.py makemigrations` produces a migration for the `UserProfile` model
- [ ] `python manage.py migrate` succeeds and creates the `api_userprofile` table and the `authtoken` table
- [ ] Creating a User via Django admin or shell automatically creates a UserProfile with a UUID
- [ ] UserProfile is visible in Django admin

## Tests

No separate test file needed for this slice -- verify by running migrations and an interactive shell check. Slice 03 will cover endpoint-level tests that implicitly validate the model.

## Size

S

## Security

### Observations

- **UUID generation**: `uuid.uuid4()` produces cryptographically random UUIDs -- suitable for external user identifiers. No predictability concern.
- **UserProfile auto-creation**: The `post_save` signal auto-creates a profile for every new User. Ensure the signal handler is idempotent (use `get_or_create` rather than `create`) to avoid crashes on duplicate signal firing during test fixtures or bulk creation.
- **Token storage**: `rest_framework.authtoken.Token` stores a hashed token in the `authtoken_token` table. DRF handles hashing transparently. No raw token storage risk.
- **Default permissions**: Setting `DEFAULT_PERMISSION_CLASSES` to `AllowAny` is correct for auth endpoints, but be aware that it applies project-wide unless overridden at the view level. The `MeView` in slice 02 must explicitly set `IsAuthenticated`.
- **Password hashing**: Django's default `PBKDF2PasswordHasher` is already configured and active. No change needed.

### No findings that require plan changes.
