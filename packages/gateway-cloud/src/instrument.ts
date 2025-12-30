/**
 * Sentry Instrumentation
 *
 * Must be imported before any other modules to ensure proper instrumentation.
 * Sentry is disabled in development environments.
 */

import * as Sentry from "@sentry/bun";

const isDevMode =
  process.env.NODE_ENV === "development" || process.env.APP_STAGE === "dev";

Sentry.init({
  dsn: "https://93142926ba7fbbd2e8605f4b93016ebe@o4510624765902848.ingest.us.sentry.io/4510624823246848",
  enabled: !isDevMode,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
});

export { Sentry };
