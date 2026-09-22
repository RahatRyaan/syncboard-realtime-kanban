# --- Stage 1: Build stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack and pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/

# Install dependencies across workspace
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/api/ ./apps/api/

# Build shared types and API
RUN pnpm --filter @syncboard/shared-types run build && \
    pnpm --filter @syncboard/api run build

# --- Stage 2: Production runner stage ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install curl for healthchecks
RUN apk add --no-cache curl

# Enable corepack and pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy root workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Security: Non-root user
USER node

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
