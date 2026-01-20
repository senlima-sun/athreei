import type { Context } from "hono"
import { createMiddleware } from "hono/factory"
import { getAuthContext, type AuthContext, type UserRole } from "./auth"
import { ApiError } from "./error"

export interface AdminContext {
  userId: string
  email: string
  role: UserRole
  permissions: string[]
  isSuperAdmin: boolean
}

export type AdminVariables = {
  admin: AdminContext
}

function getSuperAdminEmails(): Set<string> {
  const adminEmails = process.env.SUPER_ADMIN_EMAILS || ""
  return new Set(
    adminEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

export const requireAdmin = createMiddleware<{
  Variables: { auth: AuthContext; admin: AdminContext }
}>(async (c, next) => {
  const auth = getAuthContext(c)
  const superAdminEmails = getSuperAdminEmails()
  const isSuperAdmin = superAdminEmails.has(auth.email.toLowerCase())

  const isAdmin = auth.role === "admin" || isSuperAdmin
  if (!isAdmin) {
    throw ApiError.forbidden("Admin access required")
  }

  c.set("admin", {
    userId: auth.userId,
    email: auth.email,
    role: auth.role,
    permissions: isSuperAdmin ? ["*"] : ["admin"],
    isSuperAdmin,
  })

  await next()
})

export const requireModerator = createMiddleware<{
  Variables: { auth: AuthContext; admin: AdminContext }
}>(async (c, next) => {
  const auth = getAuthContext(c)
  const superAdminEmails = getSuperAdminEmails()
  const isSuperAdmin = superAdminEmails.has(auth.email.toLowerCase())

  const hasAccess =
    auth.role === "admin" || auth.role === "moderator" || isSuperAdmin
  if (!hasAccess) {
    throw ApiError.forbidden("Moderator access required")
  }

  c.set("admin", {
    userId: auth.userId,
    email: auth.email,
    role: auth.role,
    permissions: isSuperAdmin ? ["*"] : [auth.role],
    isSuperAdmin,
  })

  await next()
})

export function getAdminContext(c: Context): AdminContext {
  const admin = c.get("admin") as AdminContext | undefined
  if (!admin) {
    throw new Error(
      "Admin context not found. Did you forget to add requireAdmin middleware?"
    )
  }
  return admin
}

export function isSuperAdmin(email: string): boolean {
  const superAdminEmails = getSuperAdminEmails()
  return superAdminEmails.has(email.toLowerCase())
}
