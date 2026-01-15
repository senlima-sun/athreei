import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Hono } from "hono"
import { honoLogger } from "./hono-middleware"
import { Logger } from "./logger"

describe("honoLogger middleware", () => {
  let consoleLogs: string[] = []
  let consoleErrors: string[] = []

  beforeEach(() => {
    consoleLogs = []
    consoleErrors = []
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      // Convert all arguments to strings
      consoleLogs.push(args.map((a) => String(a)).join(" "))
    })
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      // Convert all arguments to strings
      consoleErrors.push(args.map((a) => String(a)).join(" "))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("generates unique request IDs for each request", async () => {
    const app = new Hono()
    const requestIds: string[] = []

    app.use("*", honoLogger())
    app.get("/", (c) => {
      requestIds.push(c.get("requestId"))
      return c.json({ ok: true })
    })

    await app.request("/")
    await app.request("/")

    expect(requestIds).toHaveLength(2)
    expect(requestIds[0]).not.toBe(requestIds[1])
  })

  it("attaches logger to context", async () => {
    const app = new Hono()
    let contextLogger: Logger | undefined

    app.use("*", honoLogger())
    app.get("/", (c) => {
      contextLogger = c.get("logger")
      return c.json({ ok: true })
    })

    await app.request("/")

    expect(contextLogger).toBeInstanceOf(Logger)
  })

  it("logs request start with method and path", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.get("/api/users", (c) => c.json({ users: [] }))

    await app.request("/api/users")

    const requestStartLog = consoleLogs.find((log) =>
      log.includes("Request started")
    )
    expect(requestStartLog).toBeDefined()

    const parsed = JSON.parse(requestStartLog!)
    expect(parsed.data.method).toBe("GET")
    expect(parsed.data.path).toBe("/api/users")
  })

  it("logs request completion with status and duration", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.get("/", (c) => c.json({ ok: true }))

    await app.request("/")

    const requestCompleteLog = consoleLogs.find((log) =>
      log.includes("Request completed")
    )
    expect(requestCompleteLog).toBeDefined()

    const parsed = JSON.parse(requestCompleteLog!)
    expect(parsed.data.status).toBe(200)
    expect(parsed.data.duration).toBeTypeOf("number")
  })

  it("logs 4xx responses as warnings", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.get("/notfound", (c) => c.json({ error: "Not found" }, 404))

    await app.request("/notfound")

    const warnLog = consoleErrors.find((log) =>
      log.includes("client error")
    )
    expect(warnLog).toBeDefined()

    const parsed = JSON.parse(warnLog!)
    expect(parsed.level).toBe("warn")
    expect(parsed.data.status).toBe(404)
  })

  it("logs 5xx responses as errors", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.get("/error", (c) => c.json({ error: "Server error" }, 500))

    await app.request("/error")

    const errorLog = consoleErrors.find((log) =>
      log.includes("server error")
    )
    expect(errorLog).toBeDefined()

    const parsed = JSON.parse(errorLog!)
    expect(parsed.level).toBe("error")
    expect(parsed.data.status).toBe(500)
  })

  it("logs exceptions and re-throws them", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.get("/throws", () => {
      throw new Error("Test error")
    })

    const response = await app.request("/throws")

    expect(response.status).toBe(500)

    // The error should be logged when thrown in the route handler
    // Note: Hono catches errors and returns 500, but our middleware logs it first
    const errorLog = consoleErrors.find(
      (log) => log.includes("Request failed") || log.includes("Test error")
    )
    expect(consoleErrors.length).toBeGreaterThan(0)
    expect(errorLog).toBeDefined()

    // The error details should be in the log
    expect(errorLog).toContain("Test error")
  })

  it("uses custom logger when provided", async () => {
    const app = new Hono()
    const customLogger = new Logger({
      pretty: false,
      level: "info",
      service: "custom-service",
    })

    app.use("*", honoLogger({ logger: customLogger }))
    app.get("/", (c) => c.json({ ok: true }))

    await app.request("/")

    const log = consoleLogs.find((log) => log.includes("Request started"))
    const parsed = JSON.parse(log!)

    expect(parsed.context.service).toBe("custom-service")
  })

  it("includes requestId in all logs for the same request", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.get("/", (c) => {
      const log = c.get("logger")
      log.info("Custom log message")
      return c.json({ ok: true })
    })

    await app.request("/")

    const requestIds = new Set<string>()
    for (const log of consoleLogs) {
      try {
        const parsed = JSON.parse(log)
        if (parsed.context?.requestId) {
          requestIds.add(parsed.context.requestId)
        }
      } catch {
        // Skip non-JSON logs
      }
    }

    // All logs from same request should have same requestId
    expect(requestIds.size).toBe(1)
  })

  it("skips logging when skip function returns true", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use(
      "*",
      honoLogger({
        logger,
        skip: (c) => c.req.path === "/health",
      })
    )
    app.get("/health", (c) => c.json({ status: "ok" }))
    app.get("/api", (c) => c.json({ data: [] }))

    await app.request("/health")
    const healthLogs = consoleLogs.length

    await app.request("/api")
    const apiLogs = consoleLogs.length - healthLogs

    expect(healthLogs).toBe(0) // Health check was skipped
    expect(apiLogs).toBeGreaterThan(0) // API request was logged
  })

  it("handles POST requests with different methods", async () => {
    const app = new Hono()
    const logger = new Logger({ pretty: false, level: "info" })

    app.use("*", honoLogger({ logger }))
    app.post("/api/users", (c) => c.json({ created: true }, 201))

    await app.request("/api/users", { method: "POST" })

    const log = consoleLogs.find((log) => log.includes("Request started"))
    const parsed = JSON.parse(log!)

    expect(parsed.data.method).toBe("POST")
  })
})
