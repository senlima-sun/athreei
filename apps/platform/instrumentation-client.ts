/**
 * Sentry Client-side Instrumentation
 *
 * Initializes Sentry for client-side error tracking and session replay.
 * Disabled in development environments.
 */

import * as Sentry from "@sentry/nextjs";

const isDevMode =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_APP_STAGE === "dev";

Sentry.init({
  dsn: "https://d42347c0a71b2e84aa0234294e8fe885@o4510624765902848.ingest.us.sentry.io/4510624820887552",
  enabled: !isDevMode,
  environment: process.env.NODE_ENV || "development",

  // Capture 100% in dev (when enabled), 10% in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// Instrument router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
