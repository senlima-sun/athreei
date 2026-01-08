import React from "react"
import { Box, Text } from "ink"
import { ApiError, AuthError, RateLimitError } from "../lib/api.js"

interface ErrorDisplayProps {
  error: Error | ApiError
  context?: string
}

function getErrorSuggestion(error: Error | ApiError): string {
  if (error instanceof AuthError) {
    return "Run 'athreei auth login' to authenticate"
  }

  if (error instanceof RateLimitError) {
    if (error.retryAfter) {
      return `Too many requests, try again in ${error.retryAfter} seconds`
    }
    return "Too many requests, try again later"
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 403:
        return "You may not have permission for this action"
      case 404:
        return "Check that the resource ID exists"
      case 0:
        return "Check your internet connection"
      default:
        return "An unexpected error occurred"
    }
  }

  // Network errors
  if (
    error.message.includes("fetch") ||
    error.message.includes("network") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ETIMEDOUT")
  ) {
    return "Check your internet connection"
  }

  return "An unexpected error occurred"
}

export function ErrorDisplay({ error, context }: ErrorDisplayProps) {
  const suggestion = getErrorSuggestion(error)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box>
        <Text color="red">✗ </Text>
        <Text color="red" bold>
          Error
        </Text>
        {context && <Text color="red"> {context}</Text>}
      </Box>

      <Box marginLeft={2} marginTop={1}>
        <Text>{error.message}</Text>
      </Box>

      <Box marginLeft={2} marginTop={1}>
        <Text dimColor>Suggestion: </Text>
        <Text color="yellow">{suggestion}</Text>
      </Box>

      {error instanceof ApiError && error.status > 0 && (
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>Status: </Text>
          <Text>{error.status}</Text>
        </Box>
      )}
    </Box>
  )
}

export default ErrorDisplay
