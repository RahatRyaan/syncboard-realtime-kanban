# Feature: Authentication (`auth`)

**Phase**: 1 — Backend Core (Auth, Workspace, RBAC)  
**Spec Reference**: [docs/ADR.md (ADR-0004)](file:///home/rahat-akanda/syncboard/docs/ADR.md#adr-0004-jwt-access--refresh-authentication)  
**Status**: ✅ tested + reviewed + approved

---

## Acceptance Criteria

### 1. User Registration (`POST /api/v1/auth/register`)
- [x] **AC-AUTH-01**: Given valid `{ email, password, name }`, when `POST /api/v1/auth/register` is called, it returns `201 Created` with a standard `ApiResponse` envelope containing the created `user` (excluding password hash) and a JWT `accessToken` (15m expiry).
- [x] **AC-AUTH-02**: Passwords must be securely hashed using **Argon2** (never plain text).
- [x] **AC-AUTH-03**: Registration sets a secure, httpOnly `sb_refresh` cookie containing the initial refresh token.
- [x] **AC-AUTH-04**: When an email is already registered, `POST /api/v1/auth/register` returns `409 Conflict` with `error.code = 'VERSION_CONFLICT'` / conflict message.
- [x] **AC-AUTH-05**: Invalid input (e.g. invalid email format, password < 8 characters, missing name) returns `400 Bad Request` with `error.code = 'VALIDATION_ERROR'` and details.

### 2. User Login (`POST /api/v1/auth/login`)
- [x] **AC-AUTH-06**: Given matching credentials, `POST /api/v1/auth/login` returns `200 OK` with user profile and short-lived `accessToken`.
- [x] **AC-AUTH-07**: Login issues a new refresh session and sets the httpOnly `sb_refresh` cookie.
- [x] **AC-AUTH-08**: Given incorrect email or password, returns `401 Unauthorized` with generic message `"Invalid email or password"`.

### 3. Token Refresh with Family Rotation (`POST /api/v1/auth/refresh`)
- [x] **AC-AUTH-09**: Given a valid `sb_refresh` cookie (or JSON `refreshToken`), `POST /api/v1/auth/refresh` rotates the token (invalidates old, issues new `sb_refresh` cookie) and returns `200 OK` with a new `accessToken`.
- [x] **AC-AUTH-10**: Given an expired or invalid refresh token, returns `401 Unauthorized`.
- [x] **AC-AUTH-11**: **Reuse Detection**: If a previously used/revoked refresh token is presented, all refresh tokens in that family/session are immediately invalidated and returns `401 Unauthorized`.

### 4. User Logout (`POST /api/v1/auth/logout`)
- [x] **AC-AUTH-12**: `POST /api/v1/auth/logout` revokes the current refresh session in Redis/Mongo and clears the `sb_refresh` cookie.
- [x] **AC-AUTH-13**: Returns `200 OK` with success envelope.

### 5. Profile & Protected Route Access (`GET /api/v1/auth/me`)
- [x] **AC-AUTH-14**: `GET /api/v1/auth/me` with `Authorization: Bearer <accessToken>` returns `200 OK` with the authenticated `User` object.
- [x] **AC-AUTH-15**: `GET /api/v1/auth/me` with missing or expired token returns `401 Unauthorized`.

---

## Test Execution Summary
- **Test File**: `apps/api/test/auth.e2e-spec.ts`
- **Result**: 10 passed, 0 failed (100% pass rate)
- **Suite Time**: ~3.0s
