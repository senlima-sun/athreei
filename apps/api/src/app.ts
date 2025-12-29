/**
 * Hono app configuration
 *
 * Sets up middleware, routes, and error handlers for the API server.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoutes, configRoutes, organizationsRoutes } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware";
import { getAuth } from "./lib/auth";

const app = new Hono();

// =============================================================================
// Middleware
// =============================================================================

// Request logging
app.use("*", logger());

// CORS configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      // In production, check against allowed origins
      if (process.env.NODE_ENV === "production") {
        const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [];
        return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
      }
      // Allow all origins in development (default)
      return origin;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400, // 24 hours
  })
);

// =============================================================================
// Routes
// =============================================================================

// Health check (no /api prefix for load balancer compatibility)
app.route("/health", healthRoutes);

// Public config endpoint (feature flags)
app.route("/api/config", configRoutes);

// Auth routes (delegates to Better Auth directly)
app.on(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], "/api/auth/*", async (c) => {
  const auth = getAuth();
  return auth.handler(c.req.raw);
});

// Organization routes (protected)
app.route("/api/organizations", organizationsRoutes);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.notFound(notFoundHandler);

// Global error handler
app.onError(errorHandler);

export default app;
