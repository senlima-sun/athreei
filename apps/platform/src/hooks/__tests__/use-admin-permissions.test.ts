import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockUseSession } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}))

import { useAdminPermissions } from "../use-admin-permissions"

describe("useAdminPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Admin Role", () => {
    it("returns canManageUsers=true for admin role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "admin" } },
      })

      const result = useAdminPermissions()

      expect(result.canManageUsers).toBe(true)
    })

    it("returns canImpersonate=true for admin role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "admin" } },
      })

      const result = useAdminPermissions()

      expect(result.canImpersonate).toBe(true)
    })

    it("returns isAdmin=true for admin role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "admin" } },
      })

      const result = useAdminPermissions()

      expect(result.isAdmin).toBe(true)
      expect(result.isModerator).toBe(false)
    })

    it("returns hasAnyAdminAccess=true for admin role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "admin" } },
      })

      const result = useAdminPermissions()

      expect(result.hasAnyAdminAccess).toBe(true)
    })
  })

  describe("Moderator Role", () => {
    it("returns canManageUsers=false for moderator role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "moderator" } },
      })

      const result = useAdminPermissions()

      expect(result.canManageUsers).toBe(false)
    })

    it("returns canListUsers=true for moderator role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "moderator" } },
      })

      const result = useAdminPermissions()

      expect(result.canListUsers).toBe(true)
    })

    it("returns isModerator=true for moderator role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "moderator" } },
      })

      const result = useAdminPermissions()

      expect(result.isModerator).toBe(true)
      expect(result.isAdmin).toBe(false)
    })

    it("returns hasAnyAdminAccess=true for moderator role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "moderator" } },
      })

      const result = useAdminPermissions()

      expect(result.hasAnyAdminAccess).toBe(true)
    })
  })

  describe("User Role", () => {
    it("returns all false for user role", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: "user" } },
      })

      const result = useAdminPermissions()

      expect(result.canManageUsers).toBe(false)
      expect(result.canImpersonate).toBe(false)
      expect(result.canListUsers).toBe(false)
      expect(result.isAdmin).toBe(false)
      expect(result.isModerator).toBe(false)
      expect(result.hasAnyAdminAccess).toBe(false)
    })
  })

  describe("Edge Cases", () => {
    it("handles null session gracefully", () => {
      mockUseSession.mockReturnValue({ data: null })

      const result = useAdminPermissions()

      expect(result.role).toBe("user")
      expect(result.hasAnyAdminAccess).toBe(false)
    })

    it("handles undefined user gracefully", () => {
      mockUseSession.mockReturnValue({ data: { user: undefined } })

      const result = useAdminPermissions()

      expect(result.role).toBe("user")
      expect(result.hasAnyAdminAccess).toBe(false)
    })

    it("defaults to user role when role is missing", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1" } },
      })

      const result = useAdminPermissions()

      expect(result.role).toBe("user")
      expect(result.hasAnyAdminAccess).toBe(false)
    })

    it("handles session with undefined role property", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "1", role: undefined } },
      })

      const result = useAdminPermissions()

      expect(result.role).toBe("user")
    })
  })
})
