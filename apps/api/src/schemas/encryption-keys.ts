import { z } from "zod"

export const createEncryptionKeySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Name is required").max(100),
})

export const updateEncryptionKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

export const listEncryptionKeysQuerySchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  status: z.enum(["active", "rotated", "revoked"]).optional(),
})

export type CreateEncryptionKeyInput = z.infer<typeof createEncryptionKeySchema>
export type UpdateEncryptionKeyInput = z.infer<typeof updateEncryptionKeySchema>
export type ListEncryptionKeysQuery = z.infer<
  typeof listEncryptionKeysQuerySchema
>
