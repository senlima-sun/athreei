"use client"

import { useState } from "react"
import { Puzzle } from "lucide-react"
import { cn } from "@/lib/utils"

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
}

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
}

interface PluginIconProps {
  iconUrl: string | null
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PluginIcon({
  iconUrl,
  name,
  size = "md",
  className,
}: PluginIconProps) {
  const [hasError, setHasError] = useState(false)

  if (!iconUrl || hasError) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-gray-100",
          sizeClasses[size],
          className
        )}
      >
        <Puzzle className={cn("text-gray-500", iconSizeClasses[size])} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100",
        sizeClasses[size],
        className
      )}
    >
      <img
        src={iconUrl}
        alt={`${name} icon`}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  )
}
