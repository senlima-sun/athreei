import type { Context, Next } from "hono"
import { createMiddleware } from "hono/factory"
import { getAuthContext, type AuthContext } from "./auth"
import { ApiError } from "./error"

export interface AdminContext {
  userId: string
  email: string
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

  if (!isSuperAdmin) {
    throw ApiError.forbidden("Admin access required")
  }

  c.set("admin", {
    userId: auth.userId,
    email: auth.email,
    permissions: ["*"],
    isSuperAdmin: true,
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
