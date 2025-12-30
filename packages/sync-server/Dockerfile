# Sync Server Dockerfile
# Multi-stage build for production deployment

# =============================================================================
# Build Stage
# =============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY packages/sync-server/package.json ./packages/sync-server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/sync-server ./packages/sync-server
COPY packages/shared ./packages/shared

# Build sync-server
WORKDIR /app/packages/sync-server
RUN bun run build

# =============================================================================
# Production Stage
# =============================================================================
FROM oven/bun:1-slim AS production

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/sync-server/dist ./dist
COPY --from=builder /app/packages/sync-server/package.json ./
COPY --from=builder /app/packages/sync-server/drizzle ./drizzle
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run the application
CMD ["bun", "run", "dist/index.js"]
