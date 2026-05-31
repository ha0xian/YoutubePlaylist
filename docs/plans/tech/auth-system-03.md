---
feature: auth-system
slice: 03
area: frontend
mode: extend
parallel-safe-with: [auth-system-01, auth-system-02]
---

# Frontend type update: add uuid field to AuthUser

## Goal

Add the `uuid` field to the `AuthUser` interface so the frontend matches the backend's API response shape.

## Files

- `frontend/src/api/auth.ts` (extend) -- add `uuid: string` to `AuthUser` interface

## Interfaces

### Updated `AuthUser` interface

```typescript
export interface AuthUser {
  id: number
  uuid: string
  username: string
  email: string
}
```

No changes to any other files. The `AuthProvider`, `AuthPage`, `ProtectedRoute`, and `UserMenu` all reference `user.username`, `user.email`, and `user.id` -- none of them currently reference `user.uuid`, so no consumer code needs updates. The `uuid` field will be available for future use (e.g., linking to user-specific API resources).

## Acceptance

- [ ] TypeScript compilation passes (`cd frontend && npx tsc -b`) with the new field
- [ ] `AuthUser.uuid` is typed as `string`

## Tests

No runtime tests needed; this is purely a type addition. Verify with `cd frontend && npx tsc -b`.

## Size

S

## Security

### Observations

- **No runtime risk**: This slice adds a single type field to a TypeScript interface. No logic, no network calls, no data serialization. The `uuid` field is only consumed downstream when explicitly referenced.
- **No secrets exposure**: The UUID is a public user identifier (like a username), not a secret or credential.
- **No findings.**
