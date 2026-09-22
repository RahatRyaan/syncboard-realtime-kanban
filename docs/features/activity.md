# Feature: ActivityLog Module

## Acceptance Criteria

### AC-ACT-01: Board/card mutations are logged automatically
- Creating a board logs `action: "board.create"` with `workspaceId`, `boardId`, `actorId`.
- Creating a card logs `action: "card.create"` with `workspaceId`, `boardId`, `cardId`, `actorId`.
- Moving a card logs `action: "card.move"`.

### AC-ACT-02: GET /activity returns workspace-scoped feed
- `GET /api/v1/activity?workspaceId=<id>` returns logs sorted by `createdAt desc`.
- Only workspace members can access (403 for non-members).

### AC-ACT-03: Cursor-based pagination works correctly
- `GET /api/v1/activity?workspaceId=<id>&limit=2` returns 2 items and a `nextCursor`.
- `GET /api/v1/activity?workspaceId=<id>&cursor=<nextCursor>&limit=2` returns the next page.
- Last page has `nextCursor: null`.
