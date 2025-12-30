# Gateway Cloud Dockerfile
# Multi-stage build for production deployment

# =============================================================================
# Build Stage
# =============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb ./
COPY packages/gateway-cloud/package.json ./packages/gateway-cloud/
COPY packages/gateway-core/package.json ./packages/gateway-core/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/gateway-cloud ./packages/gateway-cloud
COPY packages/gateway-core ./packages/gateway-core
COPY packages/shared ./packages/shared

# Build gateway-core first (dependency)
WORKDIR /app/packages/gateway-core
RUN bun run build

# Build gateway-cloud
WORKDIR /app/packages/gateway-cloud
RUN bun run build

# =============================================================================
# Production Stage
# =============================================================================
FROM oven/bun:1-slim AS production

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/gateway-cloud/dist ./dist
COPY --from=builder /app/packages/gateway-cloud/package.json ./
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
