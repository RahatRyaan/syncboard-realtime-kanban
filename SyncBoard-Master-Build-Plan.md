# SyncBoard — Master Build Plan (A–Z)
Copy each prompt below into Cursor's chat, in order. Review the diff before accepting each one. Run `/code-review` after every phase before moving to the next — don't skip this, it's what keeps an agent-driven build from drifting.

---

## PHASE 0 — Architecture & Foundations
**Goal:** lock the design before any code exists.

```
Use ecc-architect to design SyncBoard's system architecture: a real-time SaaS Kanban/doc collaboration tool with React+TypeScript frontend, NestJS backend, MongoDB, Socket.io, deployed on AWS (ECS Fargate + ALB + S3 + CloudFront). Output an Architecture Decision Record to docs/ADR.md covering: database choice, real-time sync strategy, conflict resolution approach (last-write-wins with version field), auth strategy (JWT access+refresh), and infra decisions with trade-offs for each. Also propose the initial folder structure for apps/api (NestJS), apps/web (React+Vite), and packages/shared-types (shared TS interfaces).
```

```
Use ecc-code-architect to scaffold apps/api as a NestJS project and apps/web as a React+TypeScript+Vite+TailwindCSS project, following the structure from docs/ADR.md. Set up packages/shared-types with a base tsconfig so both apps can import shared interfaces. Include a root package.json with workspaces, and a docker-compose.yml for local MongoDB + Redis.
```

**Checkpoint:** review the ADR and scaffold before continuing. Commit.

---

## PHASE 1 — Backend Core (Auth, Workspace, RBAC)
**Goal:** get identity and access control fully working before touching boards.

```
/feature-dev Build the Auth module in apps/api: JWT access tokens (15min) and refresh tokens (7 day), bcrypt password hashing, POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout with refresh token revocation via Redis blocklist. Write tests for each endpoint.
```

```
/feature-dev Build the Workspace module in apps/api: Workspace schema (name, ownerId, members[{userId, role}], plan), CRUD endpoints scoped to the authenticated user, invite-by-email flow using a signed invite token, POST /invites/:token to accept. Add a RolesGuard that checks the requester's role (owner/member/viewer) against the workspace before allowing writes.
```

**Checkpoint:** `/code-review`, then manually test register → login → create workspace → invite flow with curl/Postman before continuing.

---

## PHASE 2 — Boards, Cards, Activity
**Goal:** core product data model, REST-only (no real-time yet).

```
/feature-dev Build the Board module in apps/api: Board schema (workspaceId, title, lists[{_id, title, position}]), CRUD scoped to workspace membership via the RolesGuard from the Workspace module.
```

```
/feature-dev Build the Card module in apps/api: Card schema (boardId, listId, title, description, assignees[], attachments[], position, version). CRUD endpoints. Add a compound index on {boardId, listId, position}. Implement optimistic concurrency: card updates must include an expectedVersion field and increment version atomically; return 409 Conflict on mismatch.
```

```
/feature-dev Build the ActivityLog module in apps/api: log every mutating action on boards/cards/comments via a NestJS interceptor, with a compound index {workspaceId, timestamp: -1}. Build GET /activity with cursor-based pagination (cursor=lastTimestamp, limit).
```

**Checkpoint:** `/code-review`, verify indexes with `db.cards.getIndexes()` in Mongo shell.

---

## PHASE 3 — Real-Time Layer
**Goal:** live sync between connected clients.

```
/feature-dev Add Socket.io to apps/api. Authenticate the socket handshake using the existing JWT access token. Implement rooms: workspace:{id} for presence, board:{id} for card events. Implement card:move (client to server) and card:moved (server to clients) events using the existing Card module's optimistic-concurrency update — emit card:move:rejected with the current card state on version conflict instead of throwing. Use Redis (via socket.io-redis adapter) so this works correctly across multiple backend instances.
```

```
/feature-dev Add presence tracking: on presence:join {boardId}, register the user in a Redis set board:{id}:online with TTL refreshed by a heartbeat event; broadcast presence:update to the board room on join/leave/timeout.
```

**Checkpoint:** `/code-review`. Manually test with two browser tabs / wscat sessions moving the same card to confirm the version-conflict path works.

---

## PHASE 4 — Attachments, Comments, Search
**Goal:** round out collaboration features.

```
/feature-dev Add file attachments: POST /cards/:id/attachments/presign returns a presigned S3 PUT URL scoped to one object key with a short expiry; the client uploads directly to S3, then POST /cards/:id/attachments confirms and stores the resulting URL on the card.
```

```
/feature-dev Build the Comment module: Comment schema (cardId, userId, content, mentions[], createdAt), index {cardId, createdAt: -1}. Parse @username mentions server-side, create a Notification record per mention, and emit it over the card:{id} socket room if the mentioned user is online.
```

```
/feature-dev Add workspace-scoped search: a MongoDB text index across Board.title and Card.title/description, with every query scoped by workspaceId first. Endpoint: GET /search?q=&workspaceId=.
```

**Checkpoint:** `/code-review`.

---

## PHASE 5 — Frontend
**Goal:** working UI wired to everything above.

```
/feature-dev Build the frontend auth flow in apps/web: login and register pages, a SocketProvider context that connects once with the stored JWT, an auth context with token refresh handling, and protected routing.
```

```
/feature-dev Build the workspace dashboard and board view in apps/web using @dnd-kit/core for drag-and-drop lists/cards. On drag-drop, update local state optimistically, emit card:move, and roll back only on a received card:move:rejected event. Show presence avatars per board driven by presence:update socket events.
```

```
/feature-dev Build the comments panel (with @mention autocomplete against workspace members) and the activity feed (cursor-based infinite scroll) in apps/web.
```

**Checkpoint:** `/code-review`. Full manual walkthrough: register → create workspace → invite → create board → drag card → comment with mention → check activity feed.

---

## PHASE 6 — Billing Simulation & Plan Gating
```
/feature-dev Add a PlanGuard to apps/api: free plan capped at 3 boards and 2 members per workspace, pro plan unlimited. Add an admin-only endpoint to toggle a workspace's plan for testing. Surface the limit in apps/web with an upgrade prompt when hit.
```

---

## PHASE 7 — Observability & Hardening
```
/feature-dev Add GET /health (checks MongoDB and Redis connectivity, returns 200/503) and GET /metrics (Prometheus format via prom-client: request duration histogram, active socket connections gauge, error counter) to apps/api.
```

```
Run a security review pass on the auth module, RBAC guards, presigned S3 upload flow, and Socket.io handshake auth. Check for: missing input validation via class-validator, CORS misconfiguration, rate limiting gaps on auth and card:move endpoints, and any workspaceId scoping that could leak cross-tenant data.
```

```
Add rate limiting via @nestjs/throttler: 10 req/sec per user on auth endpoints and on the card:move socket handler.
```

**Checkpoint:** `/code-review` + manual pass through the security findings.

---

## PHASE 8 — Load Testing
```
Write a k6 load test script at infra/loadtest/board-sync.js that ramps to 200 concurrent WebSocket connections over 1 minute, holds for 3 minutes, joins a shared board room, and measures card:move round-trip latency. Document real results (avg/p95 latency, bottlenecks found) in docs/load-test-report.md.
```

---

## PHASE 9 — Cloud Deployment (AWS)
```
Write Dockerfiles for apps/api (multi-stage, slim runtime) and apps/web (static build served via nginx or deployed to S3+CloudFront). Write ECS Fargate task definitions, an ALB config with sticky sessions for Socket.io, and document the full deployment steps (ECR push, ECS service, MongoDB Atlas connection, Route53/CloudFront setup) in docs/DEPLOYMENT.md.
```

**Checkpoint:** deploy manually following the doc, don't let the agent run AWS CLI commands unsupervised against a real account.

---

## PHASE 10 — Final Docs
```
Use ecc-doc-updater to write a complete README.md covering: project overview, local setup (docker-compose up, env vars needed), how to run tests, and links to docs/ADR.md, docs/load-test-report.md, and docs/DEPLOYMENT.md.
```

---

## Working discipline (apply to every phase)
1. Read the diff before accepting — don't blind-accept.
2. Run `/code-review` after each feature-dev call, before starting the next one.
3. Commit after each checkpoint, not mid-phase.
4. If a build breaks: `Use ecc-build-error-resolver to fix the current build failure` rather than debugging blind.
5. Never let an agent phase deploy to real AWS without you reading the plan first.
