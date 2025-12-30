/**
 * Sentry Edge Runtime Instrumentation
 *
 * Initializes Sentry for edge runtime error tracking.
 * Disabled in development environments.
 */

import * as Sentry from "@sentry/nextjs";

const isDevMode =
  process.env.NODE_ENV === "development" || process.env.APP_STAGE === "dev";

Sentry.init({
  dsn: "https://d42347c0a71b2e84aa0234294e8fe885@o4510624765902848.ingest.us.sentry.io/4510624820887552",
  enabled: !isDevMode,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
});
