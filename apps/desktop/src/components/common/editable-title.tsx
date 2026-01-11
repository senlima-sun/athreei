import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface EditableTitleProps {
  initialValue: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
}

export function EditableTitle({
  initialValue,
  onSave,
  placeholder = "Untitled",
  className,
}: EditableTitleProps): React.ReactElement {
  const [value, setValue] = useState(initialValue)
  const lastSavedRef = useRef(initialValue)

  useEffect(() => {
    if (initialValue !== lastSavedRef.current) {
      setValue(initialValue)
      lastSavedRef.current = initialValue
    }
  }, [initialValue])

  const handleBlur = (): void => {
    if (value !== lastSavedRef.current) {
      lastSavedRef.current = value
      onSave(value)
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur()
        }
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      className={cn(
        "min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground",
        className
      )}
    />
  )
}
