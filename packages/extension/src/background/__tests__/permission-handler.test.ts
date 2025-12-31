/**
 * Tests for background permission handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { handlePermissionRequest } from "../permission-handler"

describe("Background Permission Handler", () => {
  let mockShowPermissionDialog: ReturnType<typeof vi.fn>
  let mockUpdatePermissionLevel: ReturnType<typeof vi.fn>
  let mockGetActiveTab: ReturnType<typeof vi.fn>
  let deps: {
    showPermissionDialogToUser: typeof mockShowPermissionDialog
    updatePermissionLevel: typeof mockUpdatePermissionLevel
    getActiveTab: typeof mockGetActiveTab
  }

  beforeEach(() => {
    // Create fresh mocks for each test
    mockShowPermissionDialog = vi.fn()
    mockUpdatePermissionLevel = vi.fn()
    mockGetActiveTab = vi.fn()

    deps = {
      showPermissionDialogToUser: mockShowPermissionDialog,
      updatePermissionLevel: mockUpdatePermissionLevel,
      getActiveTab: mockGetActiveTab,
    }
  })

  describe("basic permission request handling", () => {
    it("should call showPermissionDialogToUser with correct arguments", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: false,
      })

      await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
          description: "Read page content",
          aiApp: "Claude Desktop",
        },
        deps
      )

      expect(mockShowPermissionDialog).toHaveBeenCalledWith(
        "https://example.com",
        "read",
        123
      )
    })

    it("should return correct response format for allow decision", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValue(undefined)

      const result = await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "interact",
        },
        deps
      )

      expect(result).toEqual({
        decision: "allow",
        remember: true,
      })
    })

    it("should return correct response format for deny decision", async () => {
      mockGetActiveTab.mockResolvedValue(456)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "deny",
        remember: false,
      })

      const result = await handlePermissionRequest(
        {
          origin: "https://test.com",
          scope: "execute",
        },
        deps
      )

      expect(result).toEqual({
        decision: "deny",
        remember: false,
      })
    })

    it("should return correct response format for allow_once decision", async () => {
      mockGetActiveTab.mockResolvedValue(789)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow_once",
        remember: false,
      })

      const result = await handlePermissionRequest(
        {
          origin: "https://app.example.com",
          scope: "navigate",
        },
        deps
      )

      expect(result).toEqual({
        decision: "allow_once",
        remember: false,
      })
    })
  })

  describe("updatePermissionLevel calls", () => {
    it("should call updatePermissionLevel when remember=true and decision=allow", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValue(undefined)

      await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "screenshot",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).toHaveBeenCalledWith(
        "https://example.com",
        "screenshot",
        "allowed"
      )
    })

    it("should call updatePermissionLevel when remember=true and decision=deny", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "deny",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValue(undefined)

      await handlePermissionRequest(
        {
          origin: "https://malicious.com",
          scope: "execute",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).toHaveBeenCalledWith(
        "https://malicious.com",
        "execute",
        "denied"
      )
    })

    it("should NOT call updatePermissionLevel when remember=false", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: false,
      })

      await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).not.toHaveBeenCalled()
    })

    it("should NOT call updatePermissionLevel when decision=allow_once", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow_once",
        remember: false,
      })

      await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "interact",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).not.toHaveBeenCalled()
    })

    it("should NOT call updatePermissionLevel when decision=allow_once even if remember=true", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      // This is an edge case - allow_once should never have remember=true
      // but we handle it gracefully
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow_once",
        remember: true,
      })

      await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should return deny decision when getActiveTab throws", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      mockGetActiveTab.mockRejectedValue(new Error("No active tab"))

      const result = await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
        },
        deps
      )

      expect(result).toEqual({
        decision: "deny",
        remember: false,
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Background] Permission request error:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it("should return deny decision when showPermissionDialog throws", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockRejectedValue(
        new Error("Failed to show dialog")
      )

      const result = await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "interact",
        },
        deps
      )

      expect(result).toEqual({
        decision: "deny",
        remember: false,
      })
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Background] Permission request error:",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it("should still return response if updatePermissionLevel fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: true,
      })
      mockUpdatePermissionLevel.mockRejectedValue(
        new Error("Database error")
      )

      // The handler should catch the error and still return the response
      const result = await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
        },
        deps
      )

      // Should still get the allow decision
      expect(result).toEqual({
        decision: "allow",
        remember: true,
      })

      consoleErrorSpy.mockRestore()
    })

    it("should handle null/undefined tabId gracefully", async () => {
      mockGetActiveTab.mockResolvedValue(undefined)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: false,
      })

      const result = await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
        },
        deps
      )

      expect(mockShowPermissionDialog).toHaveBeenCalledWith(
        "https://example.com",
        "read",
        undefined
      )
      expect(result.decision).toBe("allow")
    })
  })

  describe("edge cases", () => {
    it("should handle all valid permission scopes", async () => {
      const scopes = [
        "read",
        "interact",
        "navigate",
        "screenshot",
        "execute",
        "custom",
      ]

      for (const scope of scopes) {
        mockGetActiveTab.mockResolvedValue(123)
        mockShowPermissionDialog.mockResolvedValue({
          decision: "allow",
          remember: false,
        })

        await handlePermissionRequest(
          {
            origin: "https://example.com",
            scope,
          },
          deps
        )

        expect(mockShowPermissionDialog).toHaveBeenCalledWith(
          "https://example.com",
          scope,
          123
        )

        // Clear mocks for next iteration
        mockShowPermissionDialog.mockClear()
      }
    })

    it("should handle missing optional fields", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: false,
      })

      const result = await handlePermissionRequest(
        {
          origin: "https://example.com",
          scope: "read",
          // description and aiApp are optional
        },
        deps
      )

      expect(result.decision).toBe("allow")
    })

    it("should handle very long origin strings", async () => {
      const longOrigin = `https://${"a".repeat(200)}.com`

      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValue(undefined)

      await handlePermissionRequest(
        {
          origin: longOrigin,
          scope: "read",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).toHaveBeenCalledWith(
        longOrigin,
        "read",
        "allowed"
      )
    })

    it("should handle special characters in origin", async () => {
      const specialOrigin = "https://example-test_123.co.uk"

      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "deny",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValue(undefined)

      await handlePermissionRequest(
        {
          origin: specialOrigin,
          scope: "execute",
        },
        deps
      )

      expect(mockUpdatePermissionLevel).toHaveBeenCalledWith(
        specialOrigin,
        "execute",
        "denied"
      )
    })
  })

  describe("integration scenarios", () => {
    it("should handle rapid sequential requests", async () => {
      mockGetActiveTab.mockResolvedValue(123)
      mockShowPermissionDialog.mockResolvedValue({
        decision: "allow",
        remember: false,
      })

      const requests = Array.from({ length: 5 }, (_, i) => ({
        origin: `https://example${i}.com`,
        scope: "read" as const,
      }))

      const results = await Promise.all(
        requests.map((req) => handlePermissionRequest(req, deps))
      )

      expect(results).toHaveLength(5)
      expect(results.every((r) => r.decision === "allow")).toBe(true)
      expect(mockShowPermissionDialog).toHaveBeenCalledTimes(5)
    })

    it("should handle mixed decision types in sequence", async () => {
      mockGetActiveTab.mockResolvedValue(123)

      // First: allow with remember
      mockShowPermissionDialog.mockResolvedValueOnce({
        decision: "allow",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValueOnce(undefined)

      const result1 = await handlePermissionRequest(
        { origin: "https://example1.com", scope: "read" },
        deps
      )

      // Second: deny with remember
      mockShowPermissionDialog.mockResolvedValueOnce({
        decision: "deny",
        remember: true,
      })
      mockUpdatePermissionLevel.mockResolvedValueOnce(undefined)

      const result2 = await handlePermissionRequest(
        { origin: "https://example2.com", scope: "execute" },
        deps
      )

      // Third: allow_once
      mockShowPermissionDialog.mockResolvedValueOnce({
        decision: "allow_once",
        remember: false,
      })

      const result3 = await handlePermissionRequest(
        { origin: "https://example3.com", scope: "interact" },
        deps
      )

      expect(result1.decision).toBe("allow")
      expect(result2.decision).toBe("deny")
      expect(result3.decision).toBe("allow_once")

      // updatePermissionLevel should only be called twice (not for allow_once)
      expect(mockUpdatePermissionLevel).toHaveBeenCalledTimes(2)
    })
  })
})
