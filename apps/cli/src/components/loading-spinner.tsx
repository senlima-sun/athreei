import React from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"

export interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <Box padding={1}>
      <Text color="yellow">
        <Spinner type="dots" />
      </Text>
      <Text> {message}</Text>
    </Box>
  )
}
