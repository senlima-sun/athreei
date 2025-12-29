/**
 * Auth middleware
 *
 * Verifies session tokens using Better Auth and attaches user info to context.
 */

import type { Context, Next } from "hono";
import { getAuth } from "../lib/auth";

/**
 * Auth context stored in Hono context
 */
export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  session: {
    id: string;
    expiresAt: Date;
  };
}

/**
 * Type for Hono context with auth variables
 */
export type AuthVariables = {
  auth: AuthContext;
};

/**
 * Auth middleware to protect routes.
 * Verifies the session token from Better Auth and attaches user info to context.
 */
export async function authMiddleware(c: Context, next: Next) {
  const auth = getAuth();

  try {
    // Get session from the request using Better Auth
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session || !session.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Attach auth context
    c.set("auth", {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
    } satisfies AuthContext);

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }
}

/**
 * Helper to get auth context from Hono context.
 * Throws if auth context is not present.
 */
export function getAuthContext(c: Context): AuthContext {
  const auth = c.get("auth") as AuthContext | undefined;
  if (!auth) {
    throw new Error("Auth context not found. Did you forget to add authMiddleware?");
  }
  return auth;
}
