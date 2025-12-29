import { betterAuth } from "better-auth";
import { createAuthConfig, type AuthConfigOptions } from "./config.ts";

/**
 * Server-side auth instance type
 */
export type Auth = ReturnType<typeof betterAuth>;

/**
 * Create a server-side Better Auth instance
 *
 * @param db - Drizzle database instance from @athreei/db
 * @param options - Additional configuration options to override defaults
 * @returns Better Auth instance for server-side usage
 *
 * @example
 * ```ts
 * import { db } from "@athreei/db";
 * import { createAuth } from "@athreei/auth/server";
 *
 * export const auth = createAuth(db);
 *
 * // Use with Hono
 * app.on(["GET", "POST"], "/api/auth/*", (c) => {
 *   return auth.handler(c.req.raw);
 * });
 * ```
 */
export function createAuth(
  db: Parameters<typeof createAuthConfig>[0],
  options: AuthConfigOptions = {}
): Auth {
  const config = createAuthConfig(db, options);
  return betterAuth(config);
}

/**
 * Re-export config creator for advanced use cases
 */
export { createAuthConfig } from "./config.ts";
