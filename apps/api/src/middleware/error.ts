import * as Sentry from "@sentry/bun"
import type { Context, ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { logger } from "../lib/logger"

export interface ErrorResponse {
  error: string
  details?: string
  code?: string
}

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

export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  // Use request-scoped logger if available, otherwise fallback to service logger
  const log = c.get("logger") ?? logger
  log.error("API error", {
    error: err,
    path: c.req.path,
    method: c.req.method,
  })

  if (err instanceof ApiError) {
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

  if (process.env.NODE_ENV === "development") {
    response.details = err.message
  }

  return c.json(response, 500)
}

export function notFoundHandler(c: Context) {
  return c.json<ErrorResponse>(
    {
      error: "Not found",
      code: "NOT_FOUND",
    },
    404
  )
}
