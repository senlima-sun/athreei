/**
 * Tests for Skills Sync API Routes
 */

import { describe, it, expect } from "vitest"
import {
  SkillCreateSchema,
  SkillUpdateSchema,
  SkillQuerySchema,
} from "../src/types"

describe("Skill Schemas", () => {
  describe("SkillCreateSchema", () => {
    it("validates a valid skill create request", () => {
      const validSkill = {
        name: "Code Review",
        description: "Best practices for code review",
        encryptedContent: "base64encryptedmarkdown==",
        tags: ["development", "review"],
        isEnabled: true,
      }

      const result = SkillCreateSchema.safeParse(validSkill)
      expect(result.success).toBe(true)
    })

    it("validates skill with only required fields", () => {
      const minimalSkill = {
        name: "Minimal Skill",
        encryptedContent: "encrypteddata==",
      }

      const result = SkillCreateSchema.safeParse(minimalSkill)
      expect(result.success).toBe(true)
    })

    it("validates skill with null description", () => {
      const skillWithNullDesc = {
        name: "No Description Skill",
        description: null,
        encryptedContent: "encrypteddata==",
      }

      const result = SkillCreateSchema.safeParse(skillWithNullDesc)
      expect(result.success).toBe(true)
    })

    it("validates skill with empty tags array", () => {
      const skillWithEmptyTags = {
        name: "No Tags Skill",
        encryptedContent: "encrypteddata==",
        tags: [],
      }

      const result = SkillCreateSchema.safeParse(skillWithEmptyTags)
      expect(result.success).toBe(true)
    })

    it("rejects empty name", () => {
      const invalidSkill = {
        name: "",
        encryptedContent: "encrypteddata==",
      }

      const result = SkillCreateSchema.safeParse(invalidSkill)
      expect(result.success).toBe(false)
    })

    it("rejects name longer than 100 characters", () => {
      const invalidSkill = {
        name: "a".repeat(101),
        encryptedContent: "encrypteddata==",
      }

      const result = SkillCreateSchema.safeParse(invalidSkill)
      expect(result.success).toBe(false)
    })

    it("rejects description longer than 500 characters", () => {
      const invalidSkill = {
        name: "Valid Name",
        description: "a".repeat(501),
        encryptedContent: "encrypteddata==",
      }

      const result = SkillCreateSchema.safeParse(invalidSkill)
      expect(result.success).toBe(false)
    })

    it("rejects more than 20 tags", () => {
      const invalidSkill = {
        name: "Too Many Tags",
        encryptedContent: "encrypteddata==",
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      }

      const result = SkillCreateSchema.safeParse(invalidSkill)
      expect(result.success).toBe(false)
    })

    it("rejects tags longer than 50 characters", () => {
      const invalidSkill = {
        name: "Long Tag Skill",
        encryptedContent: "encrypteddata==",
        tags: ["a".repeat(51)],
      }

      const result = SkillCreateSchema.safeParse(invalidSkill)
      expect(result.success).toBe(false)
    })

    it("defaults isEnabled to true", () => {
      const skill = {
        name: "Default Enabled",
        encryptedContent: "encrypteddata==",
      }

      const result = SkillCreateSchema.safeParse(skill)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isEnabled).toBe(true)
      }
    })
  })

  describe("SkillUpdateSchema", () => {
    it("validates a full update request", () => {
      const validUpdate = {
        name: "Updated Name",
        description: "Updated description",
        encryptedContent: "newencrypteddata==",
        tags: ["updated"],
        isEnabled: false,
      }

      const result = SkillUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    it("validates partial update with only name", () => {
      const partialUpdate = {
        name: "Just Name Update",
      }

      const result = SkillUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("validates partial update with only isEnabled", () => {
      const partialUpdate = {
        isEnabled: false,
      }

      const result = SkillUpdateSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
    })

    it("validates empty update (no fields)", () => {
      const emptyUpdate = {}

      const result = SkillUpdateSchema.safeParse(emptyUpdate)
      expect(result.success).toBe(true)
    })

    it("validates setting description to null", () => {
      const update = {
        description: null,
      }

      const result = SkillUpdateSchema.safeParse(update)
      expect(result.success).toBe(true)
    })

    it("rejects invalid name in update", () => {
      const invalidUpdate = {
        name: "",
      }

      const result = SkillUpdateSchema.safeParse(invalidUpdate)
      expect(result.success).toBe(false)
    })
  })

  describe("SkillQuerySchema", () => {
    it("validates empty query (uses defaults)", () => {
      const result = SkillQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(0)
      }
    })

    it("validates query with all filters", () => {
      const validQuery = {
        isEnabled: "true",
        search: "review",
        limit: 25,
        offset: 10,
      }

      const result = SkillQuerySchema.safeParse(validQuery)
      expect(result.success).toBe(true)
    })

    it("transforms isEnabled string to boolean", () => {
      const queryTrue = { isEnabled: "true" }
      const resultTrue = SkillQuerySchema.safeParse(queryTrue)
      expect(resultTrue.success).toBe(true)
      if (resultTrue.success) {
        expect(resultTrue.data.isEnabled).toBe(true)
      }

      const queryFalse = { isEnabled: "false" }
      const resultFalse = SkillQuerySchema.safeParse(queryFalse)
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

      const result = SkillQuerySchema.safeParse(query)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
        expect(result.data.offset).toBe(10)
      }
    })

    it("rejects limit greater than 100", () => {
      const result = SkillQuerySchema.safeParse({ limit: 150 })
      expect(result.success).toBe(false)
    })

    it("rejects limit less than 1", () => {
      const result = SkillQuerySchema.safeParse({ limit: 0 })
      expect(result.success).toBe(false)
    })

    it("rejects negative offset", () => {
      const result = SkillQuerySchema.safeParse({ offset: -5 })
      expect(result.success).toBe(false)
    })
  })
})

describe("Skill Database Schema Types", () => {
  it("should have skill table with correct columns", async () => {
    const { skills } = await import("../src/db/schema")

    expect(skills).toBeDefined()
    expect(skills.id).toBeDefined()
    expect(skills.account_id).toBeDefined()
    expect(skills.name).toBeDefined()
    expect(skills.description).toBeDefined()
    expect(skills.encrypted_content).toBeDefined()
    expect(skills.tags).toBeDefined()
    expect(skills.is_enabled).toBeDefined()
    expect(skills.version).toBeDefined()
    expect(skills.created_at).toBeDefined()
    expect(skills.updated_at).toBeDefined()
    expect(skills.deleted_at).toBeDefined()
  })

  it("should have itemTypeEnum include skill", async () => {
    const { itemTypeEnum } = await import("../src/db/schema")

    expect(itemTypeEnum.enumValues).toContain("skill")
  })
})

describe("Helper Functions", () => {
  describe("Base64 encoding/decoding for encrypted content", () => {
    it("roundtrips skill content through base64", () => {
      const originalContent =
        "# Code Review Best Practices\n\n- Review within 24h"
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

    it("handles unicode content in markdown", () => {
      const unicodeContent = "# 日本語スキル\n\n- ポイント1 🎯"
      const encoder = new TextEncoder()
      const original = encoder.encode(unicodeContent)

      let binary = ""
      for (let i = 0; i < original.length; i++) {
        binary += String.fromCharCode(original[i])
      }
      const base64 = btoa(binary)

      expect(base64.length).toBeGreaterThan(0)
      expect(() => atob(base64)).not.toThrow()
    })
  })
})

describe("Integration Tests (Placeholder)", () => {
  it.skip("should create a skill and retrieve it", async () => {
    // Would test: POST /api/skills -> GET /api/skills/:id
    // Requires test database setup
  })

  it.skip("should list skills with pagination", async () => {
    // Would test: GET /api/skills?limit=10&offset=0
    // Requires test database setup
  })

  it.skip("should filter skills by isEnabled", async () => {
    // Would test: GET /api/skills?isEnabled=true
    // Requires test database setup
  })

  it.skip("should search skills by name/description", async () => {
    // Would test: GET /api/skills?search=review
    // Requires test database setup
  })

  it.skip("should update a skill", async () => {
    // Would test: PATCH /api/skills/:id
    // Requires test database setup
  })

  it.skip("should soft delete a skill", async () => {
    // Would test: DELETE /api/skills/:id
    // Requires test database setup
  })

  it.skip("should increment version on content update", async () => {
    // Would test: version increments when encryptedContent changes
    // Requires test database setup
  })

  it.skip("should require authentication for all endpoints", async () => {
    // Would test: All endpoints return 401 without auth header
    // Requires test database setup
  })
})
