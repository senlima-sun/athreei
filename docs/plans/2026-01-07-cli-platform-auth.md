# CLI-Platform Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable CLI (`athreei`) to authenticate with Platform via browser-based OAuth flow, supporting multi-profile and organization switching.

**Architecture:** CLI starts local callback server, opens Platform's `/auth/cli` page, user authenticates and selects organization, Platform generates CLI token and redirects back to localhost with token. Token stored encrypted locally.

**Tech Stack:** Hono (API routes), Next.js (auth page), Ink (CLI UI), Drizzle ORM (database), AES-256-GCM (encryption)

---

## Phase 1: Database Schema

### Task 1.1: Create CLI Token Schema

**Files:**
- Create: `packages/db/src/schema/pg/cli-tokens.ts`
- Create: `packages/db/src/schema/sqlite/cli-tokens.ts`
- Modify: `packages/db/src/schema/pg/index.ts`
- Modify: `packages/db/src/schema/sqlite/index.ts`

**Step 1: Create PostgreSQL schema**

```typescript
// packages/db/src/schema/pg/cli-tokens.ts
import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { organization } from "./organization"

export const cliToken = pgTable("cli_token", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade",
  }),
  name: text("name"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
})

export const cliAuthSession = pgTable("cli_auth_session", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  callbackPort: integer("callback_port").notNull(),
  userId: text("user_id").references(() => user.id),
  organizationId: text("organization_id"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

**Step 2: Create SQLite schema**

```typescript
// packages/db/src/schema/sqlite/cli-tokens.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { user } from "./auth"
import { organization } from "./organization"

export const cliToken = sqliteTable("cli_token", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade",
  }),
  name: text("name"),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
})

export const cliAuthSession = sqliteTable("cli_auth_session", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  callbackPort: integer("callback_port").notNull(),
  userId: text("user_id").references(() => user.id),
  organizationId: text("organization_id"),
  status: text("status").notNull().default("pending"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})
```

**Step 3: Export from schema index files**

Add to `packages/db/src/schema/pg/index.ts`:
```typescript
export * from "./cli-tokens"
```

Add to `packages/db/src/schema/sqlite/index.ts`:
```typescript
export * from "./cli-tokens"
```

**Step 4: Generate migration**

Run: `cd packages/db && bun run generate`

**Step 5: Commit**

```bash
git add packages/db/
git commit -m "feat(db): add CLI token and auth session schema"
```

---

## Phase 2: API Routes

### Task 2.1: CLI Auth Initiate Endpoint

**Files:**
- Create: `apps/api/src/routes/cli-auth.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Create CLI auth routes file**

```typescript
// apps/api/src/routes/cli-auth.ts
import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { nanoid } from "nanoid"
import { getDb, getSchema } from "@athreei/db"
import { eq, and, isNull } from "drizzle-orm"
import { createHash } from "crypto"

const app = new Hono()

const initiateSchema = z.object({
  state: z.string().min(16).max(64),
  callbackPort: z.number().int().min(1024).max(65535),
})

// POST /api/auth/cli/initiate
app.post("/initiate", zValidator("json", initiateSchema), async (c) => {
  const { state, callbackPort } = c.req.valid("json")
  const db = getDb()
  const schema = getSchema()

  const sessionId = nanoid(21)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await db.insert(schema.cliAuthSession).values({
    id: sessionId,
    state,
    callbackPort,
    status: "pending",
    expiresAt,
  })

  const platformUrl = process.env.PLATFORM_URL || "http://localhost:3000"
  const authUrl = `${platformUrl}/auth/cli?session=${sessionId}`

  return c.json({ sessionId, authUrl })
})

export default app
```

**Step 2: Register route in main app**

Add to `apps/api/src/index.ts`:
```typescript
import cliAuth from "./routes/cli-auth"
// ... after other routes
app.route("/api/auth/cli", cliAuth)
```

**Step 3: Test manually**

Run API: `cd apps/api && bun run dev`

```bash
curl -X POST http://localhost:3001/api/auth/cli/initiate \
  -H "Content-Type: application/json" \
  -d '{"state":"test123456789012345","callbackPort":19284}'
```

Expected: `{"sessionId":"...","authUrl":"http://localhost:3000/auth/cli?session=..."}`

**Step 4: Commit**

```bash
git add apps/api/src/routes/cli-auth.ts apps/api/src/index.ts
git commit -m "feat(api): add CLI auth initiate endpoint"
```

### Task 2.2: CLI Token Generation Endpoint

**Files:**
- Modify: `apps/api/src/routes/cli-auth.ts`

**Step 1: Add token generation endpoint**

Add to `apps/api/src/routes/cli-auth.ts`:

```typescript
import { getAuth } from "../lib/auth"

const tokenSchema = z.object({
  sessionId: z.string(),
  organizationId: z.string(),
})

// POST /api/auth/cli/token
app.post("/token", zValidator("json", tokenSchema), async (c) => {
  const { sessionId, organizationId } = c.req.valid("json")
  const db = getDb()
  const schema = getSchema()
  const auth = getAuth()

  // Verify session from cookie (user must be logged in on Platform)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: "Not authenticated" }, 401)
  }

  // Get CLI auth session
  const [cliSession] = await db
    .select()
    .from(schema.cliAuthSession)
    .where(
      and(
        eq(schema.cliAuthSession.id, sessionId),
        eq(schema.cliAuthSession.status, "pending")
      )
    )
    .limit(1)

  if (!cliSession) {
    return c.json({ error: "Invalid or expired session" }, 400)
  }

  if (new Date() > cliSession.expiresAt) {
    return c.json({ error: "Session expired" }, 400)
  }

  // Verify user has access to organization
  const [membership] = await db
    .select()
    .from(schema.member)
    .where(
      and(
        eq(schema.member.userId, session.user.id),
        eq(schema.member.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!membership) {
    return c.json({ error: "No access to organization" }, 403)
  }

  // Generate token
  const token = `a3i_${nanoid(32)}`
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const tokenId = nanoid(21)
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

  // Save hashed token
  await db.insert(schema.cliToken).values({
    id: tokenId,
    tokenHash,
    userId: session.user.id,
    organizationId,
    expiresAt,
  })

  // Mark session as used
  await db
    .update(schema.cliAuthSession)
    .set({
      status: "used",
      userId: session.user.id,
      organizationId,
    })
    .where(eq(schema.cliAuthSession.id, sessionId))

  return c.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    organization: {
      id: organizationId,
    },
  })
})
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/cli-auth.ts
git commit -m "feat(api): add CLI token generation endpoint"
```

### Task 2.3: CLI Token Verification Endpoint

**Files:**
- Modify: `apps/api/src/routes/cli-auth.ts`

**Step 1: Add verify endpoint**

Add to `apps/api/src/routes/cli-auth.ts`:

```typescript
// GET /api/auth/cli/verify
app.get("/verify", async (c) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer a3i_")) {
    return c.json({ valid: false, error: "Invalid token format" }, 401)
  }

  const token = authHeader.slice(7) // Remove "Bearer "
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const db = getDb()
  const schema = getSchema()

  const [cliToken] = await db
    .select({
      id: schema.cliToken.id,
      userId: schema.cliToken.userId,
      organizationId: schema.cliToken.organizationId,
      expiresAt: schema.cliToken.expiresAt,
      revokedAt: schema.cliToken.revokedAt,
    })
    .from(schema.cliToken)
    .where(eq(schema.cliToken.tokenHash, tokenHash))
    .limit(1)

  if (!cliToken) {
    return c.json({ valid: false, error: "Token not found" }, 401)
  }

  if (cliToken.revokedAt) {
    return c.json({ valid: false, error: "Token revoked" }, 401)
  }

  if (new Date() > cliToken.expiresAt) {
    return c.json({ valid: false, error: "Token expired" }, 401)
  }

  // Update last used
  await db
    .update(schema.cliToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.cliToken.id, cliToken.id))

  // Get user and organizations
  const [user] = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
    })
    .from(schema.user)
    .where(eq(schema.user.id, cliToken.userId))
    .limit(1)

  const memberships = await db
    .select({
      organizationId: schema.member.organizationId,
      role: schema.member.role,
      orgName: schema.organization.name,
      orgSlug: schema.organization.slug,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.member.organizationId, schema.organization.id)
    )
    .where(eq(schema.member.userId, cliToken.userId))

  return c.json({
    valid: true,
    user,
    currentOrganization: cliToken.organizationId,
    organizations: memberships.map((m) => ({
      id: m.organizationId,
      name: m.orgName,
      slug: m.orgSlug,
      role: m.role,
    })),
  })
})
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/cli-auth.ts
git commit -m "feat(api): add CLI token verification endpoint"
```

### Task 2.4: Session Status Endpoint (for polling)

**Files:**
- Modify: `apps/api/src/routes/cli-auth.ts`

**Step 1: Add session status endpoint**

Add to `apps/api/src/routes/cli-auth.ts`:

```typescript
// GET /api/auth/cli/session/:sessionId
app.get("/session/:sessionId", async (c) => {
  const { sessionId } = c.req.param()
  const state = c.req.query("state")

  const db = getDb()
  const schema = getSchema()

  const [session] = await db
    .select()
    .from(schema.cliAuthSession)
    .where(eq(schema.cliAuthSession.id, sessionId))
    .limit(1)

  if (!session) {
    return c.json({ error: "Session not found" }, 404)
  }

  if (state && session.state !== state) {
    return c.json({ error: "Invalid state" }, 400)
  }

  if (new Date() > session.expiresAt) {
    return c.json({ status: "expired" })
  }

  return c.json({ status: session.status })
})
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/cli-auth.ts
git commit -m "feat(api): add CLI session status endpoint"
```

---

## Phase 3: Platform Auth Page

### Task 3.1: Create CLI Authorization Page

**Files:**
- Create: `apps/platform/src/app/auth/cli/page.tsx`

**Step 1: Create the authorization page**

```tsx
// apps/platform/src/app/auth/cli/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, Terminal, Check, X } from "lucide-react"

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

export default function CLIAuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, isPending: sessionLoading } = useSession()

  const sessionId = searchParams.get("session")

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [authorizing, setAuthorizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      // Redirect to login, then back here
      const returnUrl = encodeURIComponent(`/auth/cli?session=${sessionId}`)
      router.push(`/login?redirect=${returnUrl}`)
      return
    }

    // Fetch user's organizations
    async function loadOrgs() {
      try {
        const res = await fetch("/api/organizations")
        if (!res.ok) throw new Error("Failed to load organizations")
        const data = await res.json()
        setOrganizations(data)
        if (data.length > 0) {
          setSelectedOrg(data[0].id)
        }
      } catch (err) {
        setError("Failed to load organizations")
      } finally {
        setLoading(false)
      }
    }

    loadOrgs()
  }, [session, sessionLoading, sessionId, router])

  async function handleAuthorize() {
    if (!selectedOrg || !sessionId) return

    setAuthorizing(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/cli/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          organizationId: selectedOrg,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Authorization failed")
      }

      const { token } = await res.json()

      // Get session to find callback port
      const sessionRes = await fetch(`/api/auth/cli/session/${sessionId}`)
      const sessionData = await sessionRes.json()

      // Redirect to CLI callback
      // Note: We need to get the callback port from the session
      // For now, we'll use a standard approach
      setSuccess(true)

      // Redirect to localhost callback
      const callbackUrl = `http://127.0.0.1:19284/callback?token=${encodeURIComponent(token)}&state=${sessionId}`
      window.location.href = callbackUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization failed")
      setAuthorizing(false)
    }
  }

  function handleCancel() {
    window.close()
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Authorization Successful</h2>
                <p className="text-muted-foreground">
                  You can close this window and return to the terminal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-red-100 p-3">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Invalid Request</h2>
                <p className="text-muted-foreground">
                  Missing session parameter. Please try again from the CLI.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-muted p-3">
            <Terminal className="h-6 w-6" />
          </div>
          <CardTitle>Authorize CLI Access</CardTitle>
          <CardDescription>
            athreei CLI is requesting access to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Label>Select Organization</Label>
            <RadioGroup value={selectedOrg} onValueChange={setSelectedOrg}>
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center space-x-3 rounded-md border p-3"
                >
                  <RadioGroupItem value={org.id} id={org.id} />
                  <Label htmlFor={org.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{org.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({org.role})
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">CLI will be able to:</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Manage MCP servers</li>
              <li>Manage Endpoints</li>
              <li>View Traces</li>
              <li>Manage API keys (based on your role)</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAuthorize}
              disabled={!selectedOrg || authorizing}
            >
              {authorizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Authorize
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/platform/src/app/auth/cli/page.tsx
git commit -m "feat(platform): add CLI authorization page"
```

---

## Phase 4: CLI Athreei Provider

### Task 4.1: Create Athreei Provider

**Files:**
- Create: `apps/cli/src/auth/providers/athreei.ts`
- Modify: `apps/cli/src/auth/providers/index.ts`

**Step 1: Create the Athreei provider**

```typescript
// apps/cli/src/auth/providers/athreei.ts
import * as http from "http"
import * as url from "url"
import * as crypto from "crypto"
import open from "open"
import { AuthProvider, UserInfo, registerProvider } from "./index.js"
import { OAuthConfig, OAuthTokens } from "../oauth.js"
import { StoredCredentials } from "../credentials.js"

const API_URL = process.env.ATHREEI_API_URL || "http://localhost:3001"

export class AthreeiProvider implements AuthProvider {
  name = "athreei"
  displayName = "Athreei Platform"

  // Not used - we have custom flow
  getOAuthConfig(): OAuthConfig {
    return {
      clientId: "",
      authorizationUrl: "",
      tokenUrl: "",
      redirectUri: "",
      scopes: [],
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/auth/cli/verify`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await response.json()
      return data.valid === true
    } catch {
      return false
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${API_URL}/api/auth/cli/verify`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.valid) {
      throw new Error(data.error || "Invalid token")
    }

    return {
      id: data.user.id,
      username: data.user.name || data.user.email,
      email: data.user.email,
    }
  }

  toStoredCredentials(tokens: OAuthTokens): StoredCredentials {
    return {
      accessToken: tokens.accessToken,
      provider: this.name,
      expiresAt: tokens.expiresIn
        ? Date.now() + tokens.expiresIn * 1000
        : undefined,
    }
  }

  // Custom login flow for Athreei
  async performLogin(port = 19284): Promise<{
    token: string
    user: UserInfo
    organizationId: string
    expiresAt: string
  }> {
    const state = crypto.randomBytes(16).toString("hex")

    // 1. Initiate session with API
    const initResponse = await fetch(`${API_URL}/api/auth/cli/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, callbackPort: port }),
    })

    if (!initResponse.ok) {
      throw new Error("Failed to initiate authentication")
    }

    const { sessionId, authUrl } = await initResponse.json()

    // 2. Start callback server
    const tokenPromise = this.startCallbackServer(port, state)

    // 3. Open browser
    await open(authUrl)

    // 4. Wait for callback
    const token = await tokenPromise

    // 5. Verify and get user info
    const verifyResponse = await fetch(`${API_URL}/api/auth/cli/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!verifyResponse.ok) {
      throw new Error("Token verification failed")
    }

    const verifyData = await verifyResponse.json()

    return {
      token,
      user: {
        id: verifyData.user.id,
        username: verifyData.user.name || verifyData.user.email,
        email: verifyData.user.email,
      },
      organizationId: verifyData.currentOrganization,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  private startCallbackServer(
    port: number,
    expectedState: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || "", true)

        if (parsedUrl.pathname !== "/callback") {
          res.writeHead(404)
          res.end("Not found")
          return
        }

        const { token, state, error } = parsedUrl.query

        if (error) {
          res.writeHead(400)
          res.end(`Authentication failed: ${error}`)
          server.close()
          reject(new Error(`Authentication error: ${error}`))
          return
        }

        // Note: For Athreei, we use sessionId as state
        // The token is passed directly from Platform redirect

        if (!token || typeof token !== "string") {
          res.writeHead(400)
          res.end("Missing token")
          server.close()
          reject(new Error("Missing token in callback"))
          return
        }

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: system-ui; text-align: center; padding: 50px;">
              <h1>✓ Authentication Successful</h1>
              <p>You can close this window and return to the terminal.</p>
              <script>window.close();</script>
            </body>
          </html>
        `)

        server.close()
        resolve(token)
      })

      server.on("error", (err) => {
        reject(new Error(`Server error: ${err.message}`))
      })

      server.listen(port, "127.0.0.1")

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close()
        reject(new Error("Authentication timed out"))
      }, 5 * 60 * 1000)
    })
  }
}

registerProvider(new AthreeiProvider())
```

**Step 2: Import in providers index**

Add to `apps/cli/src/auth/providers/index.ts` at the bottom:
```typescript
// Auto-register providers
import "./github.js"
import "./athreei.js"
```

Wait, that's already done via side-effect imports elsewhere. Let me check...

Actually, modify `apps/cli/src/auth/manager.ts` to import athreei:

Add at top:
```typescript
import "./providers/athreei.js"
```

**Step 3: Commit**

```bash
git add apps/cli/src/auth/providers/athreei.ts apps/cli/src/auth/manager.ts
git commit -m "feat(cli): add Athreei platform provider"
```

### Task 4.2: Update AuthManager for Athreei

**Files:**
- Modify: `apps/cli/src/auth/manager.ts`

**Step 1: Add special handling for Athreei login**

Update the `login` method in `apps/cli/src/auth/manager.ts`:

```typescript
async login(providerName: string): Promise<AuthSession> {
  const provider = getProvider(providerName)
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`)
  }

  // Special handling for Athreei provider
  if (providerName === "athreei") {
    const athreeiProvider = provider as import("./providers/athreei.js").AthreeiProvider
    const result = await athreeiProvider.performLogin()

    const credentials: StoredCredentials = {
      accessToken: result.token,
      provider: providerName,
      userId: result.user.id,
      expiresAt: new Date(result.expiresAt).getTime(),
    }

    await this.store.set(`auth:${providerName}`, credentials)

    this.currentSession = {
      provider: providerName,
      accessToken: result.token,
      userId: result.user.id,
      username: result.user.username,
      expiresAt: credentials.expiresAt,
    }

    return this.currentSession
  }

  // Standard OAuth flow for other providers
  const config = provider.getOAuthConfig()
  const tokens = await performOAuthFlow(config)
  // ... rest of existing code
}
```

**Step 2: Commit**

```bash
git add apps/cli/src/auth/manager.ts
git commit -m "feat(cli): add special Athreei login handling in AuthManager"
```

### Task 4.3: Update Login Flow Component

**Files:**
- Modify: `apps/cli/src/components/login-flow.tsx`

**Step 1: Read the current file**

First check current implementation, then update to show proper messages for Athreei.

**Step 2: Update component**

The component should work as-is since it uses the AuthManager, but update the messaging:

```tsx
// Update the message state based on provider
useEffect(() => {
  if (status === "authenticating") {
    if (provider === "athreei") {
      setMessage("Opening browser for Platform authentication...")
    } else {
      setMessage(`Opening browser for ${provider} authentication...`)
    }
  }
}, [status, provider])
```

**Step 3: Commit**

```bash
git add apps/cli/src/components/login-flow.tsx
git commit -m "feat(cli): update login flow messaging for Athreei"
```

---

## Phase 5: Multi-Profile Support

### Task 5.1: Update Credential Store for Profiles

**Files:**
- Modify: `apps/cli/src/auth/credentials.ts`

**Step 1: Add profile support to StoredCredentials**

```typescript
export interface StoredCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  provider: string
  userId?: string
  organizationId?: string  // Add this
}

export interface ProfileState {
  activeProfile: string
  activeOrg: Record<string, string>  // profile -> orgId
}
```

**Step 2: Add profile state methods**

Add to `FileCredentialStore`:

```typescript
private readonly stateFile: string

constructor() {
  // ... existing code
  this.stateFile = path.join(this.configDir, "state.json")
}

async getState(): Promise<ProfileState> {
  if (!fs.existsSync(this.stateFile)) {
    return { activeProfile: "default", activeOrg: {} }
  }
  try {
    return JSON.parse(fs.readFileSync(this.stateFile, "utf-8"))
  } catch {
    return { activeProfile: "default", activeOrg: {} }
  }
}

async setState(state: ProfileState): Promise<void> {
  fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), {
    mode: 0o600,
  })
}

async getActiveProfile(): Promise<string> {
  const state = await this.getState()
  return state.activeProfile
}

async setActiveProfile(profile: string): Promise<void> {
  const state = await this.getState()
  state.activeProfile = profile
  await this.setState(state)
}

async getActiveOrg(profile?: string): Promise<string | undefined> {
  const state = await this.getState()
  const p = profile || state.activeProfile
  return state.activeOrg[p]
}

async setActiveOrg(orgId: string, profile?: string): Promise<void> {
  const state = await this.getState()
  const p = profile || state.activeProfile
  state.activeOrg[p] = orgId
  await this.setState(state)
}
```

**Step 3: Commit**

```bash
git add apps/cli/src/auth/credentials.ts
git commit -m "feat(cli): add profile state management to credential store"
```

### Task 5.2: Add Profile Flag to CLI Commands

**Files:**
- Modify: `apps/cli/src/index.tsx`

**Step 1: Add global --profile option**

```typescript
program
  .name("athreei")
  .description("Athreei CLI - Universal MCP Gateway")
  .version("0.1.0")
  .option("-p, --profile <name>", "Use a specific profile", "default")

// Update auth login command
auth
  .command("login")
  .description("Authenticate with a provider")
  .argument("[provider]", "Authentication provider", "athreei")  // Default to athreei
  .option("-t, --token <token>", "Use a personal access token")
  .action(async (provider: string, options: { token?: string }) => {
    const profile = program.opts().profile
    const { waitUntilExit } = render(
      <LoginFlow provider={provider} token={options.token} profile={profile} />
    )
    await waitUntilExit()
  })
```

**Step 2: Commit**

```bash
git add apps/cli/src/index.tsx
git commit -m "feat(cli): add global --profile option"
```

---

## Phase 6: Organization Commands

### Task 6.1: Add Organization Commands

**Files:**
- Create: `apps/cli/src/commands/org.tsx`
- Modify: `apps/cli/src/index.tsx`

**Step 1: Create org commands component**

```tsx
// apps/cli/src/commands/org.tsx
import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import Spinner from "ink-spinner"
import SelectInput from "ink-select-input"
import { getAuthManager } from "../auth/manager.js"
import { createCredentialStore } from "../auth/credentials.js"

const API_URL = process.env.ATHREEI_API_URL || "http://localhost:3001"

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

export function OrgList() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const manager = getAuthManager()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated. Run: athreei auth login")
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/cli/verify`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const data = await res.json()

        if (!data.valid) {
          setError("Session expired. Run: athreei auth login")
        } else {
          setOrgs(data.organizations)
          setCurrentOrg(data.currentOrganization)
        }
      } catch (err) {
        setError("Failed to fetch organizations")
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading organizations...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Organizations
        </Text>
      </Box>

      {orgs.map((org) => (
        <Box key={org.id}>
          <Text color={org.id === currentOrg ? "green" : "white"}>
            {org.id === currentOrg ? "● " : "○ "}
          </Text>
          <Text>{org.name}</Text>
          <Text dimColor> ({org.role})</Text>
        </Box>
      ))}
    </Box>
  )
}

export function OrgSwitch({ orgName }: { orgName: string }) {
  const { exit } = useApp()
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function switchOrg() {
      const manager = getAuthManager()
      const store = createCredentialStore()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated")
        setStatus("error")
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/cli/verify`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const data = await res.json()

        const org = data.organizations.find(
          (o: Organization) =>
            o.name.toLowerCase() === orgName.toLowerCase() ||
            o.slug.toLowerCase() === orgName.toLowerCase()
        )

        if (!org) {
          setError(`Organization "${orgName}" not found`)
          setStatus("error")
        } else {
          await store.setActiveOrg(org.id)
          setStatus("success")
        }
      } catch {
        setError("Failed to switch organization")
        setStatus("error")
      }

      setTimeout(() => exit(), 100)
    }

    switchOrg()
  }, [orgName, exit])

  if (status === "loading") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Switching organization...</Text>
      </Box>
    )
  }

  if (status === "error") {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
  }

  return (
    <Box padding={1}>
      <Text color="green">✓ Switched to {orgName}</Text>
    </Box>
  )
}

export function OrgCurrent() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const manager = getAuthManager()
      const store = createCredentialStore()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated")
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const currentOrgId = await store.getActiveOrg()
        const res = await fetch(`${API_URL}/api/auth/cli/verify`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const data = await res.json()

        const org = data.organizations.find(
          (o: Organization) => o.id === currentOrgId
        )
        setOrgName(org?.name || data.organizations[0]?.name || "None")
      } catch {
        setError("Failed to get current organization")
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">{error}</Text>
      </Box>
    )
  }

  return (
    <Box padding={1}>
      <Text>Current organization: </Text>
      <Text color="cyan" bold>
        {orgName}
      </Text>
    </Box>
  )
}
```

**Step 2: Register org commands in index.tsx**

Add to `apps/cli/src/index.tsx`:

```typescript
import { OrgList, OrgSwitch, OrgCurrent } from "./commands/org.js"

const org = program.command("org").description("Manage organizations")

org
  .command("list")
  .description("List available organizations")
  .action(async () => {
    const { waitUntilExit } = render(<OrgList />)
    await waitUntilExit()
  })

org
  .command("switch")
  .description("Switch active organization")
  .argument("<name>", "Organization name or slug")
  .action(async (name: string) => {
    const { waitUntilExit } = render(<OrgSwitch orgName={name} />)
    await waitUntilExit()
  })

org
  .command("current")
  .description("Show current organization")
  .action(async () => {
    const { waitUntilExit } = render(<OrgCurrent />)
    await waitUntilExit()
  })
```

**Step 3: Commit**

```bash
git add apps/cli/src/commands/org.tsx apps/cli/src/index.tsx
git commit -m "feat(cli): add organization management commands"
```

---

## Phase 7: Testing

### Task 7.1: Test CLI Auth Flow End-to-End

**Manual Test Steps:**

1. Start API server: `cd apps/api && bun run dev`
2. Start Platform: `cd apps/platform && bun run dev`
3. Build CLI: `cd apps/cli && bun run build`
4. Run CLI login: `./dist/index.js auth login athreei`
5. Complete browser auth flow
6. Verify token stored: `./dist/index.js auth status`
7. Test org commands: `./dist/index.js org list`

**Step: Document test results and commit any fixes**

```bash
git add -A
git commit -m "fix(cli): address issues found in e2e testing"
```

### Task 7.2: Add Unit Tests for CLI Auth

**Files:**
- Create: `apps/cli/src/auth/__tests__/athreei-provider.test.ts`

**Step 1: Create test file**

```typescript
// apps/cli/src/auth/__tests__/athreei-provider.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { AthreeiProvider } from "../providers/athreei"

describe("AthreeiProvider", () => {
  let provider: AthreeiProvider

  beforeEach(() => {
    provider = new AthreeiProvider()
  })

  describe("validateToken", () => {
    it("returns true for valid token", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      } as Response)

      const result = await provider.validateToken("a3i_testtoken")
      expect(result).toBe(true)
    })

    it("returns false for invalid token", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: false }),
      } as Response)

      const result = await provider.validateToken("invalid")
      expect(result).toBe(false)
    })

    it("returns false on network error", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"))

      const result = await provider.validateToken("a3i_testtoken")
      expect(result).toBe(false)
    })
  })

  describe("getUserInfo", () => {
    it("returns user info for valid token", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          user: { id: "user_1", email: "test@example.com", name: "Test User" },
        }),
      } as Response)

      const result = await provider.getUserInfo("a3i_testtoken")
      expect(result).toEqual({
        id: "user_1",
        username: "Test User",
        email: "test@example.com",
      })
    })

    it("throws error for invalid token", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: false, error: "Token expired" }),
      } as Response)

      await expect(provider.getUserInfo("invalid")).rejects.toThrow(
        "Token expired"
      )
    })
  })
})
```

**Step 2: Run tests**

```bash
cd apps/cli && npx vitest run src/auth/__tests__/athreei-provider.test.ts
```

**Step 3: Commit**

```bash
git add apps/cli/src/auth/__tests__/
git commit -m "test(cli): add unit tests for Athreei provider"
```

### Task 7.3: Add API Route Tests

**Files:**
- Create: `apps/api/src/__tests__/routes/cli-auth.test.ts`

**Step 1: Create test file**

```typescript
// apps/api/src/__tests__/routes/cli-auth.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest"
import { Hono } from "hono"

// Mock database
vi.mock("@athreei/db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  })),
  getSchema: vi.fn(() => ({
    cliAuthSession: {},
    cliToken: {},
  })),
}))

describe("CLI Auth Routes", () => {
  describe("POST /api/auth/cli/initiate", () => {
    it("creates session and returns auth URL", async () => {
      // Test implementation
    })

    it("rejects invalid state parameter", async () => {
      // Test implementation
    })
  })

  describe("GET /api/auth/cli/verify", () => {
    it("returns valid=true for valid token", async () => {
      // Test implementation
    })

    it("returns valid=false for expired token", async () => {
      // Test implementation
    })
  })
})
```

**Step 2: Run tests**

```bash
cd apps/api && npx vitest run src/__tests__/routes/cli-auth.test.ts
```

**Step 3: Commit**

```bash
git add apps/api/src/__tests__/routes/cli-auth.test.ts
git commit -m "test(api): add CLI auth route tests"
```

---

## Summary

### Files Created
- `packages/db/src/schema/pg/cli-tokens.ts`
- `packages/db/src/schema/sqlite/cli-tokens.ts`
- `apps/api/src/routes/cli-auth.ts`
- `apps/platform/src/app/auth/cli/page.tsx`
- `apps/cli/src/auth/providers/athreei.ts`
- `apps/cli/src/commands/org.tsx`
- `apps/cli/src/auth/__tests__/athreei-provider.test.ts`
- `apps/api/src/__tests__/routes/cli-auth.test.ts`

### Files Modified
- `packages/db/src/schema/pg/index.ts`
- `packages/db/src/schema/sqlite/index.ts`
- `apps/api/src/index.ts`
- `apps/cli/src/auth/manager.ts`
- `apps/cli/src/auth/credentials.ts`
- `apps/cli/src/index.tsx`
- `apps/cli/src/components/login-flow.tsx`

### Remaining Work (Future Tasks)
- Add `servers`, `endpoints`, `keys`, `traces` CLI commands
- Add token revocation UI in Platform dashboard
- Add rate limiting to CLI auth endpoints
- Add CLI token management in Platform settings
