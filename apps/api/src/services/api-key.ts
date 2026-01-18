import { eq, and, isNull } from "drizzle-orm"
import { db } from "../lib/db-operations"
import { apiKey, endpoint } from "@athreei/db"

export type ApiKeyValidationResult =
  | {
      valid: true
      apiKeyRecord: typeof apiKey.$inferSelect
      endpointRecord: typeof endpoint.$inferSelect
      keyHash: string
    }
  | {
      valid: false
      error: string
    }

export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return base64
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function createKeyPrefix(key: string): string {
  return `ak_${key.substring(0, 8)}`
}

export function createFullKey(key: string): string {
  return `ak_${key}`
}

export async function validateApiKey(
  key: string
): Promise<ApiKeyValidationResult> {
  const keyToHash = key.startsWith("ak_") ? key.slice(3) : key
  const keyHash = await hashApiKey(keyToHash)

  const dbQuery = db().query

  const apiKeyRecord = (await dbQuery.apiKey.findFirst({
    where: and(eq(apiKey.keyHash, keyHash), isNull(apiKey.revokedAt)),
  })) as typeof apiKey.$inferSelect | undefined

  if (!apiKeyRecord) {
    return { valid: false, error: "Invalid or revoked API key" }
  }

  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
    return { valid: false, error: "API key has expired" }
  }

  if (!apiKeyRecord.endpointId) {
    return { valid: false, error: "API key is not associated with an endpoint" }
  }

  const endpointRecord = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, apiKeyRecord.endpointId),
  })) as typeof endpoint.$inferSelect | undefined

  if (!endpointRecord) {
    return { valid: false, error: "Associated endpoint not found" }
  }

  await db()
    .update(apiKey)
    .set({
      lastUsedAt: new Date(),
      usageCount: apiKeyRecord.usageCount + 1,
    })
    .where(eq(apiKey.id, apiKeyRecord.id))

  return {
    valid: true,
    apiKeyRecord,
    endpointRecord,
    keyHash,
  }
}

export function parseAuthHeader(header: string | undefined): string | null {
  if (!header) return null

  const parts = header.split(" ")
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    return null
  }

  return parts[1] ?? null
}
