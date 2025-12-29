/**
 * Auth routes
 *
 * Delegates all auth requests to Better Auth handler.
 */

import { Hono } from "hono";
import { getAuth } from "../lib/auth";

const auth = new Hono();

/**
 * ALL /api/auth/*
 * Delegates to Better Auth handler for all auth operations
 *
 * Better Auth handles:
 * - POST /api/auth/sign-up - Register new user
 * - POST /api/auth/sign-in/email - Email/password sign in
 * - POST /api/auth/sign-out - Sign out
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/forget-password - Request password reset
 * - POST /api/auth/reset-password - Reset password
 * - GET /api/auth/verify-email - Verify email
 * - And all organization-related endpoints
 */
auth.all("/:path{.*}", async (c) => {
  const authInstance = getAuth();
  return authInstance.handler(c.req.raw);
});

// Also match the root path
auth.all("/", async (c) => {
  const authInstance = getAuth();
  return authInstance.handler(c.req.raw);
});

export default auth;
