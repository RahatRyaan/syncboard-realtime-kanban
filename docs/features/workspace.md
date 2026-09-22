# Feature: Workspace & RBAC (`workspace`)

**Phase**: 1 — Backend Core (Auth, Workspace, RBAC)  
**Spec Reference**: [docs/ADR.md (ADR-0001, ADR-0004)](file:///home/rahat-akanda/syncboard/docs/ADR.md)  
**Status**: ✅ tested + reviewed + approved

---

## Acceptance Criteria

### 1. Workspace Creation (`POST /api/v1/workspaces`)
- [x] **AC-WS-01**: Given authenticated user, `POST /api/v1/workspaces` with `{ name }` creates a workspace with auto-generated slug.
- [x] **AC-WS-02**: The creating user is automatically set as `owner` in the workspace `members` list.
- [x] **AC-WS-03**: Returns `201 Created` with standard `ApiResponse` containing the new `Workspace` document.
- [x] **AC-WS-04**: Returns `400 Bad Request` if name is missing or empty.

### 2. Workspace Listing & Retrieval (`GET /api/v1/workspaces`, `GET /api/v1/workspaces/:id`)
- [x] **AC-WS-05**: `GET /api/v1/workspaces` returns only workspaces where `members.userId === currentUser.id` (strict tenant boundary isolation).
- [x] **AC-WS-06**: `GET /api/v1/workspaces/:id` returns full workspace metadata and member list for members.
- [x] **AC-WS-07**: `GET /api/v1/workspaces/:id` returns `403 Forbidden` or `404 Not Found` if the requester is not a member.

### 3. Workspace Update & RBAC Guard (`PATCH /api/v1/workspaces/:id`)
- [x] **AC-WS-08**: `PATCH /api/v1/workspaces/:id` allows `owner` and `admin` roles to update workspace name or settings.
- [x] **AC-WS-09**: `PATCH /api/v1/workspaces/:id` returns `403 Forbidden` with `error.code = 'FORBIDDEN'` if invoked by a `member` or `viewer`.

### 4. Member Invite & Acceptance Flow (`POST /api/v1/workspaces/:id/invites`, `POST /api/v1/workspaces/invites/:token/accept`)
- [x] **AC-WS-10**: `POST /api/v1/workspaces/:id/invites` with `{ email, role }` allows `owner`/`admin` to create a signed invite token.
- [x] **AC-WS-11**: `POST /api/v1/workspaces/invites/:token/accept` allows an authenticated user to accept an invite and joins them to `members` with the assigned role.
- [x] **AC-WS-12**: Accepting an expired or tampered invite token returns `400 Bad Request` or `404 Not Found`.
- [x] **AC-WS-13**: If a user is already a member of the workspace, accepting again returns idempotent `200 OK`.

---

## Test Execution Summary
- **Jest E2E Suite**: `apps/api/test/workspace.e2e-spec.ts` (10/10 passed)
- **Playwright Suite**: `test/e2e/workspace.spec.ts` (5/5 passed)
- **Result**: 100% pass rate
