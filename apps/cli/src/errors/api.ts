export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class AuthError extends ApiError {
  constructor(message: string, body?: unknown) {
    super(401, message, body)
    this.name = "AuthError"
  }
}

export class RateLimitError extends ApiError {
  public readonly retryAfter?: number

  constructor(message: string, retryAfter?: number, body?: unknown) {
    super(429, message, body)
    this.name = "RateLimitError"
    this.retryAfter = retryAfter
  }
}
