/**
 * Tests for Rules Sync API Routes
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  RuleCreateSchema,
  RuleUpdateSchema,
  RuleQuerySchema,
} from "../src/types"

describe("Rule Schemas", () => {
  describe("RuleCreateSchema", () => {
    it("validates a valid rule create request", () => {
      const validRule = {
        name: "No Hardcoded Secrets",
        description: "Prevent hardcoded API keys and passwords",
        encryptedContent: "base64encryptedmarkdown==",
        priority: 100,
        scope: "global" as const,
        isEnabled: true,
      }

      const result = RuleCreateSchema.safeParse(validRule)
      expect(result.success).toBe(true)
    })

    it("validates rule with only required fields", () => {
      const minimalRule = {
        name: "Minimal Rule",
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(minimalRule)
      expect(result.success).toBe(true)
    })

    it("validates all scope values", () => {
      const scopes = ["global", "namespace", "endpoint"] as const
      for (const scope of scopes) {
        const rule = {
          name: `${scope} scoped rule`,
          encryptedContent: "data==",
          scope,
        }
        const result = RuleCreateSchema.safeParse(rule)
        expect(result.success).toBe(true)
      }
    })

    it("validates rule with null description", () => {
      const ruleWithNullDesc = {
        name: "No Description Rule",
        description: null,
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(ruleWithNullDesc)
      expect(result.success).toBe(true)
    })

    it("rejects empty name", () => {
      const invalidRule = {
        name: "",
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })

    it("rejects name longer than 100 characters", () => {
      const invalidRule = {
        name: "a".repeat(101),
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })

    it("rejects description longer than 500 characters", () => {
      const invalidRule = {
        name: "Valid Name",
        description: "a".repeat(501),
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })

    it("rejects priority less than 0", () => {
      const invalidRule = {
        name: "Negative Priority",
        encryptedContent: "encrypteddata==",
        priority: -1,
      }

      const result = RuleCreateSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })

    it("rejects priority greater than 1000", () => {
      const invalidRule = {
        name: "High Priority",
        encryptedContent: "encrypteddata==",
        priority: 1001,
      }

      const result = RuleCreateSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })

    it("rejects invalid scope", () => {
      const invalidRule = {
        name: "Invalid Scope",
        encryptedContent: "encrypteddata==",
        scope: "invalid",
      }

      const result = RuleCreateSchema.safeParse(invalidRule)
      expect(result.success).toBe(false)
    })

    it("defaults priority to 0", () => {
      const rule = {
        name: "Default Priority",
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(rule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.priority).toBe(0)
      }
    })

    it("defaults scope to global", () => {
      const rule = {
        name: "Default Scope",
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(rule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scope).toBe("global")
      }
    })

    it("defaults isEnabled to true", () => {
      const rule = {
        name: "Default Enabled",
        encryptedContent: "encrypteddata==",
      }

      const result = RuleCreateSchema.safeParse(rule)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isEnabled).toBe(true)
      }
    })
  })

  describe("RuleUpdateSchema", () => {
    it("validates a full update request", () => {
      const validUpdate = {
        name: "Updated Name",
        description: "Updated description",
        encryptedContent: "newencrypteddata==",
        priority: 50,
        scope: "namespace" as const,
        isEnabled: false,
      }

      const result = RuleUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it("validates partial update with only name", () => {
      const partialUpdate = {
        name: "Just Name Update",
      }

      const result = RuleUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("validates partial update with only priority", () => {
      const partialUpdate = {
        priority: 500,
      }

      const result = RuleUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("validates partial update with only scope", () => {
      const partialUpdate = {
        scope: "endpoint" as const,
      }

      const result = RuleUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("validates partial update with only isEnabled", () => {
      const partialUpdate = {
        isEnabled: false,
      }

      const result = RuleUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("validates empty update (no fields)", () => {
      const emptyUpdate = {}

      const result = RuleUpdateSchema.safeParse(emptyUpdate)
      expect(result.success).toBe(true)
    })

    it("validates setting description to null", () => {
      const update = {
        description: null,
      }

      const result = RuleUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it("rejects invalid name in update", () => {
      const invalidUpdate = {
        name: "",
      }

      const result = RuleUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })

    it("rejects invalid priority in update", () => {
      const invalidUpdate = {
        priority: -10,
      }

      const result = RuleUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })
  })

  describe("RuleQuerySchema", () => {
    it("validates empty query (uses defaults)", () => {
      const result = RuleQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(0)
      }
    })

    it("validates query with all filters", () => {
      const validQuery = {
        isEnabled: "true",
        scope: "global" as const,
        search: "security",
        limit: 25,
        offset: 10,
      }

      const result = RuleQuerySchema.safeParse(validQuery)
      expect(result.success).toBe(true)
    })

    it("validates query with scope filter", () => {
      const scopes = ["global", "namespace", "endpoint"] as const
      for (const scope of scopes) {
        const query = { scope }
        const result = RuleQuerySchema.safeParse(query)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.scope).toBe(scope)
        }
      }
    })

    it("transforms isEnabled string to boolean", () => {
      const queryTrue = { isEnabled: "true" }
      const resultTrue = RuleQuerySchema.safeParse(queryTrue)
      expect(resultTrue.success).toBe(true)
      if (resultTrue.success) {
        expect(resultTrue.data.isEnabled).toBe(true)
      }

      const queryFalse = { isEnabled: "false" }
      const resultFalse = RuleQuerySchema.safeParse(queryFalse)
      expect(resultFalse.success).toBe(true)
      if (resultFalse.success) {
        expect(resultFalse.data.isEnabled).toBe(false)
      }
    })

    it("coerces string limit and offset to numbers", () => {
      const query = {
        limit: "25",
        offset: "10",
      }

      const result = RuleQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
        expect(result.data.offset).toBe(10)
      }
    })

    it("rejects limit greater than 100", () => {
      const result = RuleQuerySchema.safeParse({ limit: 150 })
      expect(result.success).toBe(false)
    })

    it("rejects limit less than 1", () => {
      const result = RuleQuerySchema.safeParse({ limit: 0 })
      expect(result.success).toBe(false)
    })

    it("rejects negative offset", () => {
      const result = RuleQuerySchema.safeParse({ offset: -5 })
      expect(result.success).toBe(false)
    })

    it("rejects invalid scope in query", () => {
      const result = RuleQuerySchema.safeParse({ scope: "invalid" })
      expect(result.success).toBe(false)
    })
  })
})

describe("Rule Database Schema Types", () => {
  it("should have rule table with correct columns", async () => {
    const { rules } = await import("../src/db/schema")

    expect(rules).toBeDefined()
    expect(rules.id).toBeDefined()
    expect(rules.account_id).toBeDefined()
    expect(rules.name).toBeDefined()
    expect(rules.description).toBeDefined()
    expect(rules.encrypted_content).toBeDefined()
    expect(rules.priority).toBeDefined()
    expect(rules.scope).toBeDefined()
    expect(rules.is_enabled).toBeDefined()
    expect(rules.created_at).toBeDefined()
    expect(rules.updated_at).toBeDefined()
    expect(rules.deleted_at).toBeDefined()
  })

  it("should have itemTypeEnum include rule", async () => {
    const { itemTypeEnum } = await import("../src/db/schema")

    expect(itemTypeEnum.enumValues).toContain("rule")
  })

  it("should have ruleScopeEnum with correct values", async () => {
    const { ruleScopeEnum } = await import("../src/db/schema")

    expect(ruleScopeEnum.enumValues).toContain("global")
    expect(ruleScopeEnum.enumValues).toContain("namespace")
    expect(ruleScopeEnum.enumValues).toContain("endpoint")
    expect(ruleScopeEnum.enumValues).toHaveLength(3)
  })
})

describe("Rule Priority Ordering", () => {
  it("should sort rules by priority descending", () => {
    const rules = [
      { name: "Low", priority: 10 },
      { name: "High", priority: 100 },
      { name: "Medium", priority: 50 },
    ]

    const sorted = [...rules].sort((a, b) => b.priority - a.priority)

    expect(sorted[0].name).toBe("High")
    expect(sorted[1].name).toBe("Medium")
    expect(sorted[2].name).toBe("Low")
  })

  it("should handle equal priorities by preserving order", () => {
    const rules = [
      { name: "First", priority: 50, createdAt: "2024-01-01" },
      { name: "Second", priority: 50, createdAt: "2024-01-02" },
      { name: "Third", priority: 50, createdAt: "2024-01-03" },
    ]

    const sorted = [...rules].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return a.createdAt.localeCompare(b.createdAt)
    })

    expect(sorted[0].name).toBe("First")
    expect(sorted[1].name).toBe("Second")
    expect(sorted[2].name).toBe("Third")
  })
})

describe("Helper Functions", () => {
  describe("Base64 encoding/decoding for encrypted content", () => {
    it("roundtrips rule content through base64", () => {
      const originalContent =
        "# Security Rules\n\n- Never hardcode secrets\n- Use env vars"
      const encoder = new TextEncoder()
      const original = encoder.encode(originalContent)

      let binary = ""
      for (let i = 0; i < original.length; i++) {
        binary += String.fromCharCode(original[i])
      }
      const base64 = btoa(binary)

      const decoded = atob(base64)
      const bytes = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i)
      }

      const decoder = new TextDecoder()
      expect(decoder.decode(bytes)).toBe(originalContent)
    })
  })
})

describe("Integration Tests (Placeholder)", () => {
  it.skip("should create a rule and retrieve it", async () => {
    // Would test: POST /api/rules -> GET /api/rules/:id
    // Requires test database setup
  })

  it.skip("should list rules with pagination", async () => {
    // Would test: GET /api/rules?limit=10&offset=0
    // Requires test database setup
  })

  it.skip("should filter rules by scope", async () => {
    // Would test: GET /api/rules?scope=global
    // Requires test database setup
  })

  it.skip("should filter rules by isEnabled", async () => {
    // Would test: GET /api/rules?isEnabled=true
    // Requires test database setup
  })

  it.skip("should search rules by name/description", async () => {
    // Would test: GET /api/rules?search=security
    // Requires test database setup
  })

  it.skip("should update a rule", async () => {
    // Would test: PATCH /api/rules/:id
    // Requires test database setup
  })

  it.skip("should update rule priority", async () => {
    // Would test: PATCH /api/rules/:id with priority change
    // Requires test database setup
  })

  it.skip("should soft delete a rule", async () => {
    // Would test: DELETE /api/rules/:id
    // Requires test database setup
  })

  it.skip("should order rules by priority descending", async () => {
    // Would test: GET /api/rules returns sorted by priority
    // Requires test database setup
  })

  it.skip("should require authentication for all endpoints", async () => {
    // Would test: All endpoints return 401 without auth header
    // Requires test database setup
  })
})
