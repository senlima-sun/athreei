import { describe, it, expect, vi, afterEach } from "vitest"
import { gatewayLogger, createRequestLogger, log } from "../logger"

describe("Gateway Logger", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("gatewayLogger", () => {
    it("should be defined", () => {
      expect(gatewayLogger).toBeDefined()
    })

    it("should have logging methods", () => {
      expect(typeof gatewayLogger.debug).toBe("function")
      expect(typeof gatewayLogger.info).toBe("function")
      expect(typeof gatewayLogger.warn).toBe("function")
      expect(typeof gatewayLogger.error).toBe("function")
    })

    it("should have child method", () => {
      expect(typeof gatewayLogger.child).toBe("function")
    })
  })

  describe("createRequestLogger", () => {
    it("should create a child logger with context", () => {
      const requestLogger = createRequestLogger({
        traceId: "trace_123",
        requestId: "req_456",
      })

      expect(requestLogger).toBeDefined()
      expect(typeof requestLogger.info).toBe("function")
    })

    it("should accept serverName and toolName", () => {
      const requestLogger = createRequestLogger({
        serverName: "github",
        toolName: "create_issue",
      })

      expect(requestLogger).toBeDefined()
    })

    it("should work with empty context", () => {
      const requestLogger = createRequestLogger({})
      expect(requestLogger).toBeDefined()
    })
  })

  describe("log export", () => {
    it("should be same as gatewayLogger", () => {
      expect(log).toBe(gatewayLogger)
    })
  })
})
