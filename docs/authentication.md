# Authentication

SubTrack is **local-first** — the app works fully without an account. Authentication is optional and unlocks cloud-backed premium status and cross-device profile restoration.

---

## Auth Flow

### Guest (no account)

All financial data (subscriptions, bills, loans, goals, budgets) is stored in AsyncStorage on the device. No login is required.

### Registration

1. User navigates to **Settings → Sign up**.
2. Provides name, email, and password.
3. App sends `POST /api/auth/register` with `{ email, passwordHash, name, userId }`.
   - `passwordHash` is a client-side hash of the password — the raw password never leaves the device.
   - `userId` is the locally generated UUID already in `AuthContext`, so data created before registration is associated with the account.
4. On success, the app stores the JWT returned by the subsequent login call.

### Login

1. User provides email and password.
2. App sends `POST /api/auth/login` with `{ email, passwordHash }`.
3. Server validates credentials against `server_users.password_hash`.
4. Returns a **JWT** (90-day TTL, signed with `SESSION_SECRET`).
5. JWT is stored locally and attached as `Authorization: Bearer <token>` on all subsequent authenticated requests.

### Profile Restoration

On app launch, if a JWT is present, the app calls `GET /api/auth/profile` to restore the user's name and email. This covers reinstalls and new devices.

### Premium Status Sync

After login, the app calls `GET /api/premium/:email` to check premium entitlement. The result is stored in `AuthContext.user.isPremium` and persisted in AsyncStorage.

---

## JWT Details

| Property | Value |
|---|---|
| Algorithm | HS256 |
| TTL | 90 days |
| Claim | `sub` = user email |
| Header | `Authorization: Bearer <token>` |

The JWT middleware (`middlewares/jwtAuth.ts`) decodes the token and sets `req.authEmail` on the Fastify request object. Routes that use `jwtAuth` will return `401` if the token is missing or invalid.

---

## Screens

| Screen | Route |
|---|---|
| Auth landing | `/auth` |
| Login | `/auth/login` |
| Register | `/auth/register` |

---

## Security Notes

- Passwords are hashed **on the client** before transmission. The server stores only the hash.
- JWTs are never sent to Lean Technologies — Lean uses its own `leanAppToken` stored separately in `AuthContext`.
- Premium grant/revoke endpoints (`POST /api/premium/:email`, `DELETE /api/premium/:email`) are **disabled in production** and return `403`.
