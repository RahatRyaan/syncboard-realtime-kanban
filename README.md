# SyncBoard ⚡

> **Production-ready, real-time collaborative Kanban & document platform with optimistic concurrency control, presence tracking, S3 attachments, and Prometheus observability.**

Built as a high-performance monorepo using **NestJS**, **React 19 + Vite**, **MongoDB Atlas**, **Redis 7**, **Socket.io**, and **AWS Cloud Infrastructure**.

---

## 🏗️ Architecture & Technology Stack

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    SyncBoard Monorepo                  │
                               │                                                        │
   User Browser                │  ┌──────────────────────┐    ┌──────────────────────┐  │
   ───────────────────────────>│  │   apps/web (React)   │    │ packages/shared-types│  │
   (http://localhost:5173)     │  │  Vite + Tailwind CSS │    │   (TypeScript DTOs)  │  │
                               │  └──────────┬───────────┘    └──────────────────────┘  │
                               │             │ (REST / WSS)                             │
                               │             ▼                                          │
   API & WebSocket Gateway     │  ┌──────────────────────────────────────────────────┐  │
   ───────────────────────────>│  │               apps/api (NestJS)                  │  │
   (http://localhost:4000)     │  │       Socket.io Gateway + Redis Pub/Sub          │  │
                               │  └──────────┬─────────────────────────┬─────────────┘  │
                               │             │                         │                │
                               │             ▼                         ▼                │
                               │  ┌──────────────────────┐    ┌──────────────────────┐  │
                               │  │    MongoDB Atlas     │    │       Redis 7        │  │
                               │  │   (Database Cluster) │    │  (Presence & Tokens) │  │
                               │  └──────────────────────┘    └──────────────────────┘  │
                               │             │                                          │
                               │             ▼ (Presigned PUT URLs)                     │
                               │  ┌──────────────────────────────────────────────────┐  │
                               │  │                  Amazon Web Services (S3)        │  │
                               │  └──────────────────────────────────────────────────┘  │
                               └────────────────────────────────────────────────────────┘
```

- **Backend (`apps/api`):** NestJS 11, Mongoose / MongoDB Atlas, Socket.io (WebSocket gateway), Redis 7 (presence tracking & token blocklist), `@aws-sdk/client-s3`, `@nestjs/throttler`, `prom-client`.
- **Frontend (`apps/web`):** React 19, TypeScript, Vite, `@dnd-kit` (drag-and-drop), `@tanstack/react-query`, Tailwind CSS, Lucide Icons.
- **Shared Contracts (`packages/shared-types`):** Canonical TypeScript interfaces, DTOs, and Socket.io event definitions.
- **Infrastructure (`infra/`):** Docker Compose (Local DB/Redis), Multi-stage Dockerfiles, AWS ECS Fargate task definitions, ALB sticky session manifests, k6 load testing harness.

---

## 🚀 Key Features

| Domain | Key Capabilities |
|---|---|
| **Authentication & RBAC** | Argon2 password hashing, JWT access tokens (15m) + HTTP-only refresh tokens (7d) with automatic rotation, Redis blocklist, workspace roles (`owner`, `admin`, `member`, `viewer`). |
| **Real-Time Kanban** | `@dnd-kit` drag-and-drop, fractional rank ordering, optimistic local updates with version incrementing, and Socket.io broadcast. |
| **Concurrency Control** | Optimistic Concurrency Control (`expectedVersion`) returning `409 VERSION_CONFLICT` on stale writes with automatic rollback. |
| **Presence & Heartbeats** | Live collaborator avatar stack in board header, `presence:heartbeat` pings every 15s, and join/leave notifications. |
| **Cloud File Storage** | Direct browser-to-S3 uploads via presigned PUT URLs, S3 file deletion on removal, and CORS security. |
| **Comments & @Mentions** | Real-time discussion thread, `@username` mention parser, and unread notification drawer. |
| **Search** | Instant workspace-scoped text search across boards and cards with MongoDB compound indexing. |
| **Plan Gating & Billing** | Free plan caps (3 boards, 2 members) vs. Pro plan (unlimited) with in-app upgrade simulation. |
| **Observability & Health** | Active readiness probe (`GET /api/v1/health`), Prometheus telemetry (`GET /api/v1/metrics`), and rate limiting (`10 req/sec`). |

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** v20+ (Node v22 or v24 recommended)
- **pnpm** v10+ (`npm install -g pnpm`)
- **Docker & Docker Compose** (for local Redis)

---

### 2. Environment Configuration
Copy the environment template in `apps/api/`:
```bash
cp apps/api/.env.example apps/api/.env
```
*Note: Your `apps/api/.env` is pre-configured with MongoDB Atlas connection string and local Redis on port `6379`.*

---

### 3. Start Database Services
```bash
docker compose up -d
```
*Starts local Redis container on `localhost:6379`.*

---

### 4. Install Dependencies & Build
```bash
pnpm install
pnpm build
```

---

### 5. Run Backend & Frontend in Parallel
```bash
pnpm dev
```

*Or run individually:*
- **Backend API:** `pnpm dev:api` (Runs on [http://localhost:4000/api/v1](http://localhost:4000/api/v1) & `ws://localhost:4000`)
- **Frontend App:** `pnpm dev:web` (Runs on [http://localhost:5173](http://localhost:5173))

---

## 🧪 Testing Runbook

SyncBoard includes test suites across all layers of the stack:

### Run All Unit Tests (Jest)
```bash
pnpm --filter @syncboard/api run test
# Runs 19 unit tests covering Storage, Comments, Search, Cards, Workspaces, Boards, Health, and Metrics
```

### Run Backend E2E Tests (Jest + Supertest)
```bash
pnpm --filter @syncboard/api run test:e2e
# Runs 20 isolated in-memory E2E tests for Auth, Refresh Rotation, Workspace RBAC, and RolesGuard
```

### Run Full User Journey E2E Tests (Playwright)
```bash
pnpm exec playwright test
# Runs 17 Playwright E2E browser tests for Registration, Login, Workspace isolation, Drag-and-Drop, S3, and Comments
```

### Run 200-Client Concurrency Load Benchmark
```bash
node infra/loadtest/bench-runner.mjs
# Connects 200 concurrent WebSocket clients, tests real-time card move latency, and verifies OCC under stress
```

---

## 📦 Production Containerization & Cloud Deployment

### Build Production Docker Images Locally
```bash
# 1. Build API Container (Node 22 Alpine)
docker build -t syncboard-api -f apps/api/Dockerfile .

# 2. Build Web Frontend Container (Nginx Alpine)
docker build -t syncboard-web -f apps/web/Dockerfile .
```

### Complete AWS Production Runbook
Detailed instructions for **Amazon ECR**, **AWS ECS Fargate**, **Application Load Balancer (ALB)** with sticky sessions, **MongoDB Atlas**, **ElastiCache Redis**, and **CloudFront CDN** are documented in:
👉 **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**

---

## 📚 Project Documentation

- **Architecture Decision Record (ADR):** [`docs/ADR.md`](docs/ADR.md)
- **Production AWS Deployment Guide:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Load Testing & Concurrency Benchmark Report:** [`docs/load-test-report.md`](docs/load-test-report.md)
- **Phase-by-Phase Progress Tracker:** [`docs/PROGRESS.md`](docs/PROGRESS.md)
- **Master Engineering Build Plan:** [`SyncBoard-Master-Build-Plan.md`](SyncBoard-Master-Build-Plan.md)

---

## 📄 License
MIT License © 2026 SyncBoard Team
