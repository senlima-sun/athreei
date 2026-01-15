import { describe, expect, it } from "vitest"
import {
  formatError,
  formatJson,
  formatPretty,
  getTimestamp,
} from "./formatters"
import type { LogEntry } from "./types"

describe("formatters", () => {
  describe("getTimestamp", () => {
    it("returns ISO 8601 format", () => {
      const timestamp = getTimestamp()
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it("returns current time (within reasonable margin)", () => {
      const before = Date.now()
      const timestamp = getTimestamp()
      const after = Date.now()
      const parsed = new Date(timestamp).getTime()

      expect(parsed).toBeGreaterThanOrEqual(before)
      expect(parsed).toBeLessThanOrEqual(after)
    })
  })

  describe("formatError", () => {
    it("extracts message, name, and stack from Error objects", () => {
      const error = new Error("Test error message")
      const result = formatError(error)

      expect(result.message).toBe("Test error message")
      expect(result.name).toBe("Error")
      expect(result.stack).toBeDefined()
      expect(result.stack).toContain("Test error message")
    })

    it("handles custom error types", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = "CustomError"
        }
      }

      const error = new CustomError("Custom message")
      const result = formatError(error)

      expect(result.message).toBe("Custom message")
      expect(result.name).toBe("CustomError")
    })

    it("handles string errors", () => {
      const result = formatError("Simple string error")

      expect(result.message).toBe("Simple string error")
      expect(result.name).toBeUndefined()
      expect(result.stack).toBeUndefined()
    })

    it("handles object errors with message property", () => {
      const result = formatError({
        message: "Object error",
        code: "ERR_CODE",
      })

      expect(result.message).toBe("Object error")
    })

    it("handles objects without message property", () => {
      const result = formatError({ code: "ERR_CODE", details: "some details" })

      expect(result.message).toContain("code")
      expect(result.message).toContain("ERR_CODE")
    })

    it("handles null and undefined", () => {
      expect(formatError(null).message).toBe("null")
      expect(formatError(undefined).message).toBe("undefined")
    })

    it("handles numbers and booleans", () => {
      expect(formatError(42).message).toBe("42")
      expect(formatError(false).message).toBe("false")
    })
  })

  describe("formatJson", () => {
    it("produces valid JSON with all fields", () => {
      const entry: LogEntry = {
        level: "info",
        message: "Test message",
        timestamp: "2024-01-15T10:30:00.000Z",
        context: { service: "test", requestId: "abc123" },
        data: { userId: 42 },
      }

      const result = formatJson(entry)
      const parsed = JSON.parse(result)

      expect(parsed.level).toBe("info")
      expect(parsed.message).toBe("Test message")
      expect(parsed.timestamp).toBe("2024-01-15T10:30:00.000Z")
      expect(parsed.context.service).toBe("test")
      expect(parsed.context.requestId).toBe("abc123")
      expect(parsed.data.userId).toBe(42)
    })

    it("produces compact single-line output", () => {
      const entry: LogEntry = {
        level: "error",
        message: "Error occurred",
        timestamp: "2024-01-15T10:30:00.000Z",
        error: { message: "Something went wrong", name: "Error" },
      }

      const result = formatJson(entry)

      // Should not contain newlines (compact)
      expect(result).not.toContain("\n")
      // Should be parseable
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it("handles entries with minimal fields", () => {
      const entry: LogEntry = {
        level: "debug",
        message: "Simple",
        timestamp: "2024-01-15T10:30:00.000Z",
      }

      const result = formatJson(entry)
      const parsed = JSON.parse(result)

      expect(parsed.level).toBe("debug")
      expect(parsed.message).toBe("Simple")
      expect(parsed.context).toBeUndefined()
      expect(parsed.data).toBeUndefined()
      expect(parsed.error).toBeUndefined()
    })
  })

  describe("formatPretty", () => {
    it("includes time portion of timestamp", () => {
      const entry: LogEntry = {
        level: "info",
        message: "Test",
        timestamp: "2024-01-15T10:30:45.123Z",
      }

      const result = formatPretty(entry)

      // Should include HH:mm:ss.sss
      expect(result).toContain("10:30:45.123")
    })

    it("includes level label", () => {
      const levels: LogEntry["level"][] = ["debug", "info", "warn", "error"]

      for (const level of levels) {
        const entry: LogEntry = {
          level,
          message: "Test",
          timestamp: "2024-01-15T10:30:00.000Z",
        }

        const result = formatPretty(entry)
        expect(result.toUpperCase()).toContain(level.toUpperCase())
      }
    })

    it("includes service name when present", () => {
      const entry: LogEntry = {
        level: "info",
        message: "Test",
        timestamp: "2024-01-15T10:30:00.000Z",
        context: { service: "my-service" },
      }

      const result = formatPretty(entry)
      expect(result).toContain("[my-service]")
    })

    it("includes truncated request ID when present", () => {
      const entry: LogEntry = {
        level: "info",
        message: "Test",
        timestamp: "2024-01-15T10:30:00.000Z",
        context: { requestId: "12345678-abcd-efgh-ijkl" },
      }

      const result = formatPretty(entry)
      // Should include first 8 chars of requestId
      expect(result).toContain("(12345678)")
    })

    it("includes message", () => {
      const entry: LogEntry = {
        level: "info",
        message: "This is my log message",
        timestamp: "2024-01-15T10:30:00.000Z",
      }

      const result = formatPretty(entry)
      expect(result).toContain("This is my log message")
    })

    it("includes data as JSON", () => {
      const entry: LogEntry = {
        level: "info",
        message: "Test",
        timestamp: "2024-01-15T10:30:00.000Z",
        data: { userId: 42, action: "login" },
      }

      const result = formatPretty(entry)
      expect(result).toContain('"userId":42')
      expect(result).toContain('"action":"login"')
    })

    it("includes error details on separate lines", () => {
      const entry: LogEntry = {
        level: "error",
        message: "Failed",
        timestamp: "2024-01-15T10:30:00.000Z",
        error: {
          message: "Something went wrong",
          name: "TypeError",
          stack: "TypeError: Something went wrong\n    at test.js:10:5",
        },
      }

      const result = formatPretty(entry)
      expect(result).toContain("TypeError: Something went wrong")
      expect(result).toContain("\n")
    })

    it("uses ANSI color codes", () => {
      const entry: LogEntry = {
        level: "error",
        message: "Test",
        timestamp: "2024-01-15T10:30:00.000Z",
      }

      const result = formatPretty(entry)
      // Should contain ANSI escape codes
      expect(result).toContain("\x1b[")
    })
  })
})
