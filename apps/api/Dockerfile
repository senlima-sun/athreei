# API Server Dockerfile
# Multi-stage build for production deployment

# =============================================================================
# Build Stage
# =============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace config
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/email/package.json ./packages/email/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/auth ./packages/auth
COPY packages/email ./packages/email
COPY apps/api ./apps/api

# Build dependencies first
WORKDIR /app/packages/shared
RUN bun run build

WORKDIR /app/packages/db
RUN bun run build

WORKDIR /app/packages/auth
RUN bun run build

WORKDIR /app/packages/email
RUN bun run build

# Build API
WORKDIR /app/apps/api
RUN bun run build

# =============================================================================
# Production Stage
# =============================================================================
FROM oven/bun:1-slim AS production

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run the application
CMD ["bun", "run", "dist/index.js"]
