# --- Stage 1: Build stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack and pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install dependencies across workspace
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web/ ./apps/web/

# Build shared types and web application
RUN pnpm --filter @syncboard/shared-types run build && \
    pnpm --filter @syncboard/web run build

# --- Stage 2: Nginx Web Server ---
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
