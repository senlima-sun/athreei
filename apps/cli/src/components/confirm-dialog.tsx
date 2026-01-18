import { Box, Text, useInput } from "ink"
import SelectInput from "ink-select-input"

export interface ConfirmDialogProps {
  title: string
  message?: string
  warning?: string
  details?: Array<{ label: string; value: string }>
  onConfirm: () => void
  onCancel: () => void
  variant?: "danger" | "warning" | "default"
  useKeyboard?: boolean
}

export function ConfirmDialog({
  title,
  message,
  warning,
  details,
  onConfirm,
  onCancel,
  variant = "default",
  useKeyboard = false,
}: ConfirmDialogProps) {
  const titleColor =
    variant === "danger" ? "red" : variant === "warning" ? "yellow" : "cyan"

  useInput(
    (input) => {
      if (!useKeyboard) return
      if (input.toLowerCase() === "y") {
        onConfirm()
      } else if (input.toLowerCase() === "n" || input === "\x1B") {
        onCancel()
      }
    },
    { isActive: useKeyboard }
  )

  const confirmOptions = [
    {
      label: variant === "danger" ? "Yes, delete" : "Yes, confirm",
      value: "yes",
    },
    { label: "No, cancel", value: "no" },
  ]

  const handleSelect = (item: { value: string }) => {
    if (item.value === "yes") {
      onConfirm()
    } else {
      onCancel()
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={titleColor}>
          {title}
        </Text>
      </Box>

      {details && details.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {details.map((detail) => (
            <Box key={detail.label}>
              <Text dimColor>{detail.label}: </Text>
              <Text bold>{detail.value}</Text>
            </Box>
          ))}
        </Box>
      )}

      {message && (
        <Box marginTop={1}>
          <Text color={variant === "danger" ? "yellow" : "white"}>
            {message}
          </Text>
        </Box>
      )}

      {useKeyboard ? (
        <>
          <Box marginTop={1}>
            <Text bold>(y/n)</Text>
          </Box>
          {warning && (
            <Box marginTop={1}>
              <Text dimColor>{warning}</Text>
            </Box>
          )}
        </>
      ) : (
        <SelectInput items={confirmOptions} onSelect={handleSelect} />
      )}
    </Box>
  )
}
