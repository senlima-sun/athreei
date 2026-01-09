import { createAuth, type Auth } from "@athreei/auth"
import { getDb, detectDatabaseType } from "@athreei/db"
import { emailCallbacks } from "./email"

let _auth: Auth | null = null

export function getAuth(): Auth {
  if (!_auth) {
    const db = getDb()
    const databaseUrl = process.env.DATABASE_URL
    const provider = databaseUrl
      ? detectDatabaseType(databaseUrl) === "postgresql"
        ? "pg"
        : "sqlite"
      : "sqlite"

    _auth = createAuth(db, {
      provider,
      baseURL: process.env.AUTH_BASE_URL || "http://localhost:3001",
      basePath: "/api/auth",
      trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
        "http://localhost:3000",
        "http://localhost:5173",
      ],
      email: process.env.RESEND_API_KEY ? emailCallbacks : undefined,
    })
  }
  return _auth
}

export function resetAuth(): void {
  _auth = null
}

export type { Auth }
