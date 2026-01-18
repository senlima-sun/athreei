import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"

const { mockUseSession, mockStopImpersonating } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockStopImpersonating: vi.fn(),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
    admin: {
      stopImpersonating: mockStopImpersonating,
    },
  },
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<unknown>) =>
    React.createElement("button", props, children),
}))

import { ImpersonationBanner } from "../impersonation-banner"

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStopImpersonating.mockResolvedValue({})
  })

  describe("Rendering", () => {
    it("renders when session.impersonatedBy is set", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "user@example.com" },
          session: { impersonatedBy: "admin-user-id" },
        },
      })

      const component = ImpersonationBanner()

      expect(component).not.toBeNull()
    })

    it("does not render for normal sessions", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "user@example.com" },
          session: {},
        },
      })

      const component = ImpersonationBanner()

      expect(component).toBeNull()
    })

    it("does not render when impersonatedBy is undefined", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: { email: "user@example.com" },
          session: { impersonatedBy: undefined },
        },
      })

      const component = ImpersonationBanner()

      expect(component).toBeNull()
    })

    it("does not render when session is null", () => {
      mockUseSession.mockReturnValue({ data: null })

      const component = ImpersonationBanner()

      expect(component).toBeNull()
    })
  })

  describe("Edge Cases", () => {
    it("handles missing session data gracefully", () => {
      mockUseSession.mockReturnValue({
        data: { user: null, session: null },
      })

      const component = ImpersonationBanner()

      expect(component).toBeNull()
    })

    it("handles undefined session property gracefully", () => {
      mockUseSession.mockReturnValue({
        data: { user: { email: "test@test.com" } },
      })

      const component = ImpersonationBanner()

      expect(component).toBeNull()
    })
  })
})
