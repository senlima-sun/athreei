import { getAuthManager } from "../auth/manager"
import { debug } from "./output"
import { ApiError, AuthError, RateLimitError } from "../errors/index"
import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
} from "../constants/index"

export { ApiError, AuthError, RateLimitError }

interface RequestOptions {
  timeout?: number
  headers?: Record<string, string>
}

export class ApiClient {
  private baseUrl: string
  private defaultTimeout: number

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl ?? process.env.ATHREEI_API_URL ?? DEFAULT_BASE_URL
    this.defaultTimeout = timeout ?? DEFAULT_TIMEOUT
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const manager = getAuthManager()
    const session = await manager.getSession("athreei")

    if (!session) {
      throw new AuthError("Not authenticated. Run: athreei auth login")
    }

    return {
      Authorization: `Bearer ${session.accessToken}`,
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const timeout = options?.timeout ?? this.defaultTimeout
    let lastError: Error | null = null
    let backoffMs = INITIAL_BACKOFF_MS

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const authHeaders = await this.getAuthHeaders()
        const headers: Record<string, string> = {
          ...authHeaders,
          ...options?.headers,
        }

        if (body !== undefined) {
          headers["Content-Type"] = "application/json"
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
          const url = `${this.baseUrl}${path}`
          debug(`${method} ${url}`)
          if (body !== undefined) {
            debug("Request body:", body)
          }

          const response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          })

          debug(`Response: ${response.status} ${response.statusText}`)

          clearTimeout(timeoutId)

          if (response.status === 401) {
            const responseBody = await this.parseResponseBody(response)
            throw new AuthError(
              responseBody?.message ?? "Authentication failed",
              responseBody
            )
          }

          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After")
            const retryAfterMs = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : undefined
            const responseBody = await this.parseResponseBody(response)

            if (attempt < MAX_RETRIES) {
              const waitTime = retryAfterMs ?? backoffMs
              await this.sleep(waitTime)
              backoffMs *= 2
              continue
            }

            throw new RateLimitError(
              responseBody?.message ?? "Rate limit exceeded",
              retryAfterMs ? retryAfterMs / 1000 : undefined,
              responseBody
            )
          }

          if (!response.ok) {
            const responseBody = await this.parseResponseBody(response)
            throw new ApiError(
              response.status,
              responseBody?.message ?? `Request failed: ${response.statusText}`,
              responseBody
            )
          }

          if (
            response.status === 204 ||
            response.headers.get("Content-Length") === "0"
          ) {
            return undefined as T
          }

          return (await response.json()) as T
        } catch (error) {
          clearTimeout(timeoutId)

          if (error instanceof AuthError || error instanceof ApiError) {
            throw error
          }

          if (error instanceof Error && error.name === "AbortError") {
            throw new ApiError(0, `Request timeout after ${timeout}ms`)
          }

          throw error
        }
      } catch (error) {
        if (error instanceof AuthError) {
          throw error
        }

        if (error instanceof ApiError && error.status !== 429) {
          throw error
        }

        lastError = error instanceof Error ? error : new Error(String(error))

        if (!(error instanceof RateLimitError)) {
          throw error
        }
      }
    }

    throw lastError ?? new ApiError(0, "Request failed after maximum retries")
  }

  private async parseResponseBody(
    response: Response
  ): Promise<{ message?: string } | null> {
    try {
      const text = await response.text()
      if (!text) return null
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options)
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("POST", path, body, options)
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("PATCH", path, body, options)
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options)
  }
}

let apiClient: ApiClient | null = null

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient()
  }
  return apiClient
}
