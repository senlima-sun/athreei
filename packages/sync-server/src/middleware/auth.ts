import type { Context, Next } from "hono"
import type { JwtPayload, AuthContext } from "../types"
import { base64urlEncode, base64urlDecode } from "../utils/base64"

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET environment variable is required in production"
      )
    }
    return "development-secret-do-not-use-in-production"
  }
  return secret
}

const JWT_SECRET = getJwtSecret()

export async function signJwt(payload: JwtPayload): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT",
  }

  const now = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  }

  const encodedHeader = base64urlEncode(JSON.stringify(header))
  const encodedPayload = base64urlEncode(JSON.stringify(tokenPayload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Use Web Crypto API for HMAC
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signatureInput)
  )

  const encodedSignature = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  )

  return `${signatureInput}.${encodedSignature}`
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".")

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null
    }

    // Verify signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )

    const signature = Uint8Array.from(base64urlDecode(encodedSignature), (c) =>
      c.charCodeAt(0)
    )

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(signatureInput)
    )

    if (!isValid) {
      return null
    }

    // Decode payload
    const payload = JSON.parse(base64urlDecode(encodedPayload)) as JwtPayload

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch (_error) {
    return null
  }
}

// Middleware to protect routes
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const token = authHeader.substring(7)
  const payload = await verifyJwt(token)

  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401)
  }

  c.set("auth", {
    accountId: payload.accountId,
    email: payload.email,
  } as AuthContext)

  await next()
}

// Helper to get auth context
export function getAuthContext(c: Context): AuthContext {
  const auth = c.get("auth")
  if (!auth) {
    throw new Error("Auth context not found")
  }
  return auth as AuthContext
}
