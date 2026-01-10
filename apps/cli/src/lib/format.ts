export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "green"
    case "inactive":
      return "gray"
    case "pending":
      return "yellow"
    case "error":
      return "red"
    default:
      return "white"
  }
}

export interface ToolInputSchema {
  type: string
  properties?: Record<string, { type: string; description?: string }>
  required?: string[]
}

export function formatSchemaType(schema: ToolInputSchema): string {
  if (!schema.properties) return "(no parameters)"

  const props = Object.entries(schema.properties)
  if (props.length === 0) return "(no parameters)"

  const required = new Set(schema.required ?? [])
  return props
    .map(([name, prop]) => {
      const isRequired = required.has(name)
      return `${name}${isRequired ? "" : "?"}: ${prop.type}`
    })
    .join(", ")
}
