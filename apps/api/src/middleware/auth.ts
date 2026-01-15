import type { Context, Next } from "hono"
import { getAuth } from "../lib/auth"
import { logger } from "../lib/logger"

export interface AuthContext {
  userId: string
  email: string
  name: string
  session: {
    id: string
    expiresAt: Date
  }
}

export type AuthVariables = {
  auth: AuthContext
}

export async function authMiddleware(c: Context, next: Next) {
  const auth = getAuth()

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session || !session.user) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    c.set("auth", {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
    } satisfies AuthContext)

    await next()
  } catch (error) {
    // Use request-scoped logger if available, otherwise fallback to service logger
    const log = c.get("logger") ?? logger
    log.error("Authentication failed", { error })
    return c.json({ error: "Authentication failed" }, 401)
  }
}

export function getAuthContext(c: Context): AuthContext {
  const auth = c.get("auth") as AuthContext | undefined
  if (!auth) {
    throw new Error(
      "Auth context not found. Did you forget to add authMiddleware?"
    )
  }
  return auth
}
