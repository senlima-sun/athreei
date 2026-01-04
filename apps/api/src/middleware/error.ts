/**
 * Error handling middleware
 *
 * Provides consistent error responses across the API.
 * - Client errors (4xx): Logged to console only
 * - Server errors (5xx): Logged to console AND sent to Sentry
 */

import * as Sentry from "@sentry/bun"
import type { Context, ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string
  details?: string
  code?: string
}

/**
 * Custom API error class with status code
 */
export class ApiError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(400, message, code)
  }

  static unauthorized(message = "Unauthorized", code?: string): ApiError {
    return new ApiError(401, message, code)
  }

  static forbidden(message = "Forbidden", code?: string): ApiError {
    return new ApiError(403, message, code)
  }

  static notFound(message = "Not found", code?: string): ApiError {
    return new ApiError(404, message, code)
  }

  static conflict(message: string, code?: string): ApiError {
    return new ApiError(409, message, code)
  }

  static internal(message = "Internal server error", code?: string): ApiError {
    return new ApiError(500, message, code)
  }
}

/**
 * Global error handler for the API
 *
 * - Client errors (4xx, validation): console.error only
 * - Server errors (5xx, unexpected): console.error + Sentry
 */
export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  // Always log to console for debugging
  console.error("API Error:", err)

  // Handle known API errors
  if (err instanceof ApiError) {
    // Only send server errors (5xx) to Sentry
    if (err.statusCode >= 500) {
      Sentry.captureException(err, {
        tags: {
          statusCode: err.statusCode,
          errorCode: err.code,
        },
        extra: {
          path: c.req.path,
          method: c.req.method,
        },
      })
    }

    const response: ErrorResponse = {
      error: err.message,
    }
    if (err.code) {
      response.code = err.code
    }
    return c.json(response, err.statusCode)
  }

  // Handle Zod validation errors (client error - no Sentry)
  if (err.name === "ZodError") {
    return c.json<ErrorResponse>(
      {
        error: "Validation error",
        details: err.message,
        code: "VALIDATION_ERROR",
      },
      400
    )
  }

  // Handle unknown errors - always send to Sentry (these are bugs)
  Sentry.captureException(err, {
    tags: {
      errorType: "unhandled",
    },
    extra: {
      path: c.req.path,
      method: c.req.method,
    },
  })

  const response: ErrorResponse = {
    error: "Internal server error",
  }

  // Include details in development mode
  if (process.env.NODE_ENV === "development") {
    response.details = err.message
  }

  return c.json(response, 500)
}

/**
 * Not found handler
 */
export function notFoundHandler(c: Context) {
  return c.json<ErrorResponse>(
    {
      error: "Not found",
      code: "NOT_FOUND",
    },
    404
  )
}
