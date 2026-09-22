# Feature: Card Module

## Acceptance Criteria

### AC-CARD-01: Create card in a column
- `POST /api/v1/cards` with `{ boardId, columnId, title }` returns 201.
- Card has `version: 1`, `rank`, empty `assigneeIds`, `attachments`, `labels`.

### AC-CARD-02: List cards by board (optionally filtered by column)
- `GET /api/v1/cards?boardId=<id>` returns all cards in board sorted by rank.
- `GET /api/v1/cards?boardId=<id>&columnId=<id>` returns only cards in that column.

### AC-CARD-03: Get single card by ID
- Returns 200 with card data.
- Non-existent returns 404.

### AC-CARD-04: Update card — optimistic concurrency enforced
- `PATCH /api/v1/cards/:id` with `{ title, expectedVersion: 1 }` succeeds when version matches → returns card with `version: 2`.
- `PATCH /api/v1/cards/:id` with stale `expectedVersion` returns **409** with body `{ success: false, error: { code: 'VERSION_CONFLICT' }, data: <current card> }`.

### AC-CARD-05: Move card between columns — optimistic concurrency enforced
- `PATCH /api/v1/cards/:id/move` with `{ targetColumnId, targetRank, expectedVersion }` succeeds → card's `columnId` and `rank` updated, `version` incremented.
- Stale `expectedVersion` → 409 with current card state in body.

### AC-CARD-06: Delete card
- Returns 200 `{ success: true }`.

### AC-CARD-07: Compound index exists on { boardId, columnId, rank }
- Verified via `db.cards.getIndexes()`.
