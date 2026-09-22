# Feature: Board Module

## Acceptance Criteria

### AC-BOARD-01: Create board scoped to workspace
- `POST /api/v1/boards` with valid JWT and `{ workspaceId, title }` returns 201.
- Board document has `workspaceId`, `title`, `version: 1`, timestamps.

### AC-BOARD-02: Only workspace members can create boards
- Non-member (stranger) gets 403.
- Unauthenticated request gets 401.

### AC-BOARD-03: List boards filtered by workspace
- `GET /api/v1/boards?workspaceId=<id>` returns only boards in that workspace.
- Stranger gets empty list (tenant isolation enforced at query level).

### AC-BOARD-04: Get single board by ID — membership enforced
- Member gets 200 with board data.
- Stranger gets 403.
- Non-existent ID gets 404.

### AC-BOARD-05: Update board with optimistic concurrency
- `PATCH /api/v1/boards/:id` with `{ title, expectedVersion }` succeeds (200) when version matches.
- Returns 409 when `expectedVersion` does not match current version.
- Only owner/admin can update (member gets 403).

### AC-BOARD-06: Delete board — owner/admin only
- Owner can delete → 200 `{ success: true }`.
- Member gets 403.
