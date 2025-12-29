import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

/**
 * Auth client type
 */
export type AuthClient = ReturnType<typeof createAuthClient>;

/**
 * Create a client-side auth instance for React applications
 *
 * @param baseURL - The base URL of your auth server (e.g., "http://localhost:3000")
 * @returns Auth client with React hooks and methods
 *
 * @example
 * ```tsx
 * // lib/auth-client.ts
 * import { createClient } from "@athreei/auth/client";
 *
 * export const authClient = createClient("http://localhost:3000");
 * export const { useSession, signIn, signOut, signUp } = authClient;
 *
 * // components/User.tsx
 * import { useSession } from "@/lib/auth-client";
 *
 * export function User() {
 *   const { data: session, isPending, error } = useSession();
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!session) return <div>Not logged in</div>;
 *
 *   return <div>Welcome, {session.user.name}</div>;
 * }
 * ```
 */
export function createClient(baseURL: string): AuthClient {
  return createAuthClient({
    baseURL,
    plugins: [
      organizationClient(),
    ],
  });
}

/**
 * Re-export createAuthClient for advanced use cases
 */
export { createAuthClient } from "better-auth/react";
export { organizationClient } from "better-auth/client/plugins";
