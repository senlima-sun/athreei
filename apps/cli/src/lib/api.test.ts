import { describe, it, expect } from "vitest"
import { ApiError, AuthError, RateLimitError, getApiClient } from "./api"

describe("ApiError", () => {
  it("should instantiate with status and message", () => {
    const error = new ApiError(404, "Not found")
    expect(error.status).toBe(404)
    expect(error.message).toBe("Not found")
    expect(error.name).toBe("ApiError")
    expect(error.body).toBeUndefined()
  })

  it("should instantiate with optional body", () => {
    const body = { details: "Resource not found" }
    const error = new ApiError(404, "Not found", body)
    expect(error.body).toEqual(body)
  })

  it("should be an instance of Error", () => {
    const error = new ApiError(500, "Internal error")
    expect(error).toBeInstanceOf(Error)
  })
})

describe("AuthError", () => {
  it("should instantiate with message", () => {
    const error = new AuthError("Not authenticated")
    expect(error.status).toBe(401)
    expect(error.message).toBe("Not authenticated")
    expect(error.name).toBe("AuthError")
  })

  it("should instantiate with optional body", () => {
    const body = { reason: "Token expired" }
    const error = new AuthError("Authentication failed", body)
    expect(error.body).toEqual(body)
  })

  it("should extend ApiError", () => {
    const error = new AuthError("Unauthorized")
    expect(error).toBeInstanceOf(ApiError)
  })
})

describe("RateLimitError", () => {
  it("should instantiate with message", () => {
    const error = new RateLimitError("Too many requests")
    expect(error.status).toBe(429)
    expect(error.message).toBe("Too many requests")
    expect(error.name).toBe("RateLimitError")
    expect(error.retryAfter).toBeUndefined()
  })

  it("should instantiate with retryAfter", () => {
    const error = new RateLimitError("Rate limited", 60)
    expect(error.retryAfter).toBe(60)
  })

  it("should instantiate with optional body", () => {
    const body = { limit: 100, remaining: 0 }
    const error = new RateLimitError("Rate limit exceeded", 30, body)
    expect(error.body).toEqual(body)
  })

  it("should extend ApiError", () => {
    const error = new RateLimitError("Too many requests")
    expect(error).toBeInstanceOf(ApiError)
  })
})

describe("getApiClient", () => {
  it("should return an ApiClient instance", () => {
    const client = getApiClient()
    expect(client).toBeDefined()
    expect(typeof client.get).toBe("function")
    expect(typeof client.post).toBe("function")
    expect(typeof client.patch).toBe("function")
    expect(typeof client.delete).toBe("function")
  })

  it("should return the same instance on subsequent calls", () => {
    const client1 = getApiClient()
    const client2 = getApiClient()
    expect(client1).toBe(client2)
  })
})
