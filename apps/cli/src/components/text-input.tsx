import { Box, Text, useInput } from "ink"

export interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
}

export function TextInput({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
}: TextInputProps) {
  useInput((input, key) => {
    if (key.return) {
      onSubmit()
    } else if (key.backspace || key.delete) {
      onChange(value.slice(0, -1))
    } else if (!key.ctrl && !key.meta && input) {
      onChange(value + input)
    }
  })

  return (
    <Box>
      <Text color="cyan">{label}: </Text>
      <Text>{value || <Text dimColor>{placeholder ?? ""}</Text>}</Text>
      <Text color="green">|</Text>
    </Box>
  )
}
