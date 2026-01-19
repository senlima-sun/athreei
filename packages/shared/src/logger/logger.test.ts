import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Logger } from "./logger"
import type { LogLevel } from "./types"

describe("Logger", () => {
  let consoleLogs: string[] = []
  let consoleErrors: string[] = []

  beforeEach(() => {
    consoleLogs = []
    consoleErrors = []
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      consoleLogs.push(msg)
    })
    vi.spyOn(console, "error").mockImplementation((msg: string) => {
      consoleErrors.push(msg)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("log level filtering", () => {
    it("filters debug logs when level is info", () => {
      const logger = new Logger({ level: "info", pretty: false })

      logger.debug("Debug message")
      logger.info("Info message")

      expect(consoleLogs).toHaveLength(1)
      expect(consoleLogs[0]).toContain("Info message")
    })

    it("shows all logs when level is debug", () => {
      const logger = new Logger({ level: "debug", pretty: false })

      logger.debug("Debug message")
      logger.info("Info message")
      logger.warn("Warn message")
      logger.error("Error message")

      expect(consoleLogs).toHaveLength(2)
      expect(consoleErrors).toHaveLength(2)
    })

    it("only shows error logs when level is error", () => {
      const logger = new Logger({ level: "error", pretty: false })

      logger.debug("Debug")
      logger.info("Info")
      logger.warn("Warn")
      logger.error("Error")

      expect(consoleLogs).toHaveLength(0)
      expect(consoleErrors).toHaveLength(1)
      expect(consoleErrors[0]).toContain("Error")
    })

    it("shows warn and error when level is warn", () => {
      const logger = new Logger({ level: "warn", pretty: false })

      logger.debug("Debug")
      logger.info("Info")
      logger.warn("Warn")
      logger.error("Error")

      expect(consoleLogs).toHaveLength(0)
      expect(consoleErrors).toHaveLength(2)
    })
  })

  describe("output routing", () => {
    it("sends debug and info to stdout (console.log)", () => {
      const logger = new Logger({ level: "debug", pretty: false })

      logger.debug("Debug message")
      logger.info("Info message")

      expect(consoleLogs).toHaveLength(2)
      expect(consoleErrors).toHaveLength(0)
    })

    it("sends warn and error to stderr (console.error)", () => {
      const logger = new Logger({ level: "debug", pretty: false })

      logger.warn("Warn message")
      logger.error("Error message")

      expect(consoleLogs).toHaveLength(0)
      expect(consoleErrors).toHaveLength(2)
    })
  })

  describe("JSON output", () => {
    it("produces valid JSON when pretty is false", () => {
      const logger = new Logger({ level: "info", pretty: false })

      logger.info("Test message", { userId: 42 })

      expect(consoleLogs).toHaveLength(1)
      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.level).toBe("info")
      expect(parsed.message).toBe("Test message")
      expect(parsed.data.userId).toBe(42)
    })

    it("includes timestamp in ISO format", () => {
      const logger = new Logger({ level: "info", pretty: false })

      logger.info("Test")

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
    })
  })

  describe("data parameter", () => {
    it("includes data in output", () => {
      const logger = new Logger({ level: "info", pretty: false })

      logger.info("Message", { key: "value", count: 123 })

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.data.key).toBe("value")
      expect(parsed.data.count).toBe(123)
    })

    it("handles error objects in data", () => {
      const logger = new Logger({ level: "info", pretty: false })
      const error = new Error("Test error")

      logger.info("Message", { error })

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.error.message).toBe("Test error")
      expect(parsed.error.name).toBe("Error")
      expect(parsed.error.stack).toBeDefined()
      expect(parsed.data).toBeUndefined()
    })

    it("keeps other data when error is extracted", () => {
      const logger = new Logger({ level: "info", pretty: false })
      const error = new Error("Test error")

      logger.info("Message", { error, userId: 42 })

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.error.message).toBe("Test error")
      expect(parsed.data.userId).toBe(42)
    })
  })

  describe("context", () => {
    it("includes service in context", () => {
      const logger = new Logger({
        level: "info",
        pretty: false,
        service: "api",
      })

      logger.info("Test")

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.context.service).toBe("api")
    })
  })

  describe("child logger", () => {
    it("inherits parent config", () => {
      const parent = new Logger({ level: "warn", pretty: false })
      const child = parent.child({ requestId: "abc123" })

      child.info("Should be filtered")
      child.warn("Should appear")

      expect(consoleLogs).toHaveLength(0)
      expect(consoleErrors).toHaveLength(1)
    })

    it("merges context with parent", () => {
      const parent = new Logger({
        level: "info",
        pretty: false,
        service: "api",
      })
      const child = parent.child({ requestId: "abc123" })

      child.info("Test")

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.context.service).toBe("api")
      expect(parsed.context.requestId).toBe("abc123")
    })

    it("does not modify parent context", () => {
      const parent = new Logger({
        level: "info",
        pretty: false,
        service: "api",
      })
      const child = parent.child({ requestId: "abc123" })

      parent.info("Parent log")
      child.info("Child log")

      const parentParsed = JSON.parse(consoleLogs[0])
      const childParsed = JSON.parse(consoleLogs[1])

      expect(parentParsed.context.requestId).toBeUndefined()
      expect(childParsed.context.requestId).toBe("abc123")
    })

    it("can create nested children", () => {
      const root = new Logger({ level: "info", pretty: false, service: "api" })
      const request = root.child({ requestId: "req1" })
      const operation = request.child({ operation: "createUser" })

      operation.info("Test")

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.context.service).toBe("api")
      expect(parsed.context.requestId).toBe("req1")
      expect(parsed.context.operation).toBe("createUser")
    })

    it("child can override parent context values", () => {
      const parent = new Logger({ level: "info", pretty: false })
      const parentWithContext = parent.child({ env: "development" })
      const child = parentWithContext.child({ env: "test" })

      child.info("Test")

      const parsed = JSON.parse(consoleLogs[0])
      expect(parsed.context.env).toBe("test")
    })
  })

  describe("pretty output", () => {
    it("uses colored output when pretty is true", () => {
      const logger = new Logger({ level: "info", pretty: true })

      logger.info("Test message")

      expect(consoleLogs).toHaveLength(1)
      // Should contain ANSI escape codes
      expect(consoleLogs[0]).toContain("\x1b[")
    })
  })

  describe("default config", () => {
    it("defaults to info level", () => {
      const logger = new Logger({ pretty: false })

      logger.debug("Debug - should not appear")
      logger.info("Info - should appear")

      expect(consoleLogs).toHaveLength(1)
      expect(consoleLogs[0]).toContain("Info")
    })
  })

  describe("log levels array", () => {
    it("respects level hierarchy: debug < info < warn < error", () => {
      const levels: LogLevel[] = ["debug", "info", "warn", "error"]

      for (let i = 0; i < levels.length; i++) {
        consoleLogs = []
        consoleErrors = []

        const logger = new Logger({ level: levels[i], pretty: false })

        logger.debug("debug")
        logger.info("info")
        logger.warn("warn")
        logger.error("error")

        const totalLogs = consoleLogs.length + consoleErrors.length
        // Should log (4 - i) messages
        expect(totalLogs).toBe(4 - i)
      }
    })
  })
})
