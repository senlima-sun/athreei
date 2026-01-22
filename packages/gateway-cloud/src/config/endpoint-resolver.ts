import { z } from "zod"
import type { EndpointConfig } from "../types"

const endpointConfigSchema = z.object({
  endpointId: z.string(),
  endpointName: z.string(),
  namespaceId: z.string(),
  namespaceName: z.string(),
  namespaceSlug: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  servers: z.array(z.unknown()),
  configVersion: z.string(),
})

export interface EndpointResolverOptions {
  platformUrl: string
  apiKey: string
}

export interface ResolveResult {
  success: boolean
  config?: EndpointConfig
  error?: string
  statusCode?: number
}

export async function resolveEndpoint(
  endpointName: string,
  options: EndpointResolverOptions
): Promise<ResolveResult> {
  const { platformUrl, apiKey } = options

  if (!apiKey) {
    return {
      success: false,
      error: "Missing API key",
      statusCode: 401,
    }
  }

  try {
    const url = `${platformUrl}/api/gateway/config?endpoint=${encodeURIComponent(endpointName)}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `Endpoint not found: ${endpointName}`,
          statusCode: 404,
        }
      }
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: "Unauthorized access to endpoint",
          statusCode: 401,
        }
      }
      return {
        success: false,
        error: `Failed to resolve endpoint: ${response.status}`,
        statusCode: response.status,
      }
    }

    const payload = await response.json()
    const parseResult = endpointConfigSchema.safeParse(payload)

    if (!parseResult.success) {
      return {
        success: false,
        error: "Invalid endpoint config",
        statusCode: 502,
      }
    }

    const config = parseResult.data as EndpointConfig

    return {
      success: true,
      config,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    }
  }
}

export function createEndpointKey(
  endpointId: string,
  sessionId: string
): string {
  return `${endpointId}:${sessionId}`
}

export function parseEndpointKey(
  key: string
): { endpointId: string; sessionId: string } | null {
  const parts = key.split(":")
  if (parts.length !== 2) return null
  const [endpointId, sessionId] = parts as [string, string]
  return { endpointId, sessionId }
}
