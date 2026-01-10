import { z } from "zod"

export const envVarSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  required: z.boolean(),
})

export const registryMcpServerSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string(),
  publisher: z.string().min(1),
  iconUrl: z.string().url().optional(),
  transport: z.enum(["stdio", "sse"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  docsUrl: z.string().url(),
  envVars: z.array(envVarSchema),
  categories: z.array(z.string().min(1)),
  verified: z.boolean(),
})

export const registryFileSchema = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  lastUpdated: z.string().datetime(),
  servers: z.array(registryMcpServerSchema),
})

export type EnvVar = z.infer<typeof envVarSchema>
export type RegistryMcpServer = z.infer<typeof registryMcpServerSchema>
export type RegistryFile = z.infer<typeof registryFileSchema>

export function validateRegistryFile(data: unknown): RegistryFile {
  return registryFileSchema.parse(data)
}

export function safeValidateRegistryFile(data: unknown): {
  success: boolean
  data?: RegistryFile
  error?: z.ZodError
} {
  const result = registryFileSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
