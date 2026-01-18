/**
 * @athreei/auth - Better Auth integration for athreei
 *
 * This package provides authentication functionality using Better Auth
 * with Drizzle adapter and organization plugin support.
 *
 * @example Server-side usage:
 * ```ts
 * import { db } from "@athreei/db";
 * import { createAuth } from "@athreei/auth/server";
 *
 * export const auth = createAuth(db);
 * ```
 *
 * @example Client-side usage:
 * ```ts
 * import { createClient } from "@athreei/auth/client";
 *
 * export const authClient = createClient("http://localhost:3000");
 * ```
 */

// Server exports
export { createAuth, createAuthConfig, type Auth } from "./server.ts"

// Config types
export {
  type AuthConfigOptions,
  type DatabaseProvider,
  type EmailCallbacks,
} from "./config.ts"

// Client exports
export { createClient, type AuthClient } from "./client.ts"

// Permissions exports
export {
  ac,
  baseStatement,
  baseAdminRole,
  baseModeratorRole,
  roles,
  type BaseStatement,
} from "./permissions.ts"
