import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">): React.ReactElement {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-8 w-full min-w-0 rounded bg-muted px-2.5 py-1.5 text-sm outline-none transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring",
        "aria-invalid:ring-destructive/30 aria-invalid:ring-1",
        className
      )}
      {...props}
    />
  )
}

export { Input }
