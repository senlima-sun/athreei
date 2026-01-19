/**
 * MCP Context Module Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  setMcpContext,
  getMcpContext,
  getAiAppName,
  clearMcpContext,
  isClientConnected,
  type McpContext,
} from "../index"

describe("MCP Context Module", () => {
  beforeEach(() => {
    clearMcpContext()
  })

  describe("setMcpContext", () => {
    it("should set the context with client info", () => {
      const context: McpContext = {
        clientName: "Claude Desktop",
        clientVersion: "1.0.0",
        connectedAt: new Date("2024-01-01T00:00:00Z"),
      }

      setMcpContext(context)

      expect(getMcpContext()).toEqual(context)
    })

    it("should overwrite previous context", () => {
      setMcpContext({
        clientName: "Old Client",
        clientVersion: "0.1.0",
        connectedAt: new Date(),
      })

      const newContext: McpContext = {
        clientName: "New Client",
        clientVersion: "2.0.0",
        connectedAt: new Date(),
      }

      setMcpContext(newContext)

      expect(getMcpContext()?.clientName).toBe("New Client")
    })
  })

  describe("getMcpContext", () => {
    it("should return null when no context is set", () => {
      expect(getMcpContext()).toBeNull()
    })

    it("should return the current context", () => {
      const context: McpContext = {
        clientName: "ChatGPT",
        clientVersion: "4.0.0",
        connectedAt: new Date(),
      }

      setMcpContext(context)

      expect(getMcpContext()).toEqual(context)
    })
  })

  describe("getAiAppName", () => {
    it("should return 'AI Assistant' when no context is set", () => {
      expect(getAiAppName()).toBe("AI Assistant")
    })

    it("should return the client name when context is set", () => {
      setMcpContext({
        clientName: "Claude Desktop",
        clientVersion: "1.0.0",
        connectedAt: new Date(),
      })

      expect(getAiAppName()).toBe("Claude Desktop")
    })

    it("should handle various AI app names", () => {
      const testCases = [
        "Claude Desktop",
        "ChatGPT",
        "Cursor",
        "Continue",
        "Cline",
        "custom-mcp-client",
      ]

      for (const name of testCases) {
        setMcpContext({
          clientName: name,
          clientVersion: "1.0.0",
          connectedAt: new Date(),
        })

        expect(getAiAppName()).toBe(name)
      }
    })
  })

  describe("clearMcpContext", () => {
    it("should clear the context", () => {
      setMcpContext({
        clientName: "Test Client",
        clientVersion: "1.0.0",
        connectedAt: new Date(),
      })

      expect(getMcpContext()).not.toBeNull()

      clearMcpContext()

      expect(getMcpContext()).toBeNull()
    })

    it("should make getAiAppName return default after clear", () => {
      setMcpContext({
        clientName: "Test Client",
        clientVersion: "1.0.0",
        connectedAt: new Date(),
      })

      clearMcpContext()

      expect(getAiAppName()).toBe("AI Assistant")
    })
  })

  describe("isClientConnected", () => {
    it("should return false when no context is set", () => {
      expect(isClientConnected()).toBe(false)
    })

    it("should return true when context is set", () => {
      setMcpContext({
        clientName: "Test Client",
        clientVersion: "1.0.0",
        connectedAt: new Date(),
      })

      expect(isClientConnected()).toBe(true)
    })

    it("should return false after context is cleared", () => {
      setMcpContext({
        clientName: "Test Client",
        clientVersion: "1.0.0",
        connectedAt: new Date(),
      })

      clearMcpContext()

      expect(isClientConnected()).toBe(false)
    })
  })
})
