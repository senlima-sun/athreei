import * as Sentry from "@sentry/bun"

const isDevMode =
  process.env.NODE_ENV === "development" || process.env.APP_STAGE === "dev"

Sentry.init({
  dsn: "https://e4a3c76b6539e4c19a87884f75d27cf9@o4510624765902848.ingest.us.sentry.io/4510624819052544",
  enabled: !isDevMode,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
  sendDefaultPii: true,
})

export { Sentry }
