/**
 * Config routes
 *
 * Exposes public configuration and feature flags to the frontend.
 */

import { Hono } from "hono";

const config = new Hono();

/**
 * GET /api/config
 * Returns public configuration and feature flags
 */
config.get("/", (c) => {
  return c.json({
    features: {
      emailVerification: !!process.env.RESEND_API_KEY,
      passwordReset: !!process.env.RESEND_API_KEY,
    },
  });
});

export default config;
