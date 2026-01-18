"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EnvVarInputProps {
  name: string
  description?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  sensitive?: boolean
  error?: string
  disabled?: boolean
}

export function EnvVarInput({
  name,
  description,
  required = false,
  value,
  onChange,
  sensitive = false,
  error,
  disabled = false,
}: EnvVarInputProps) {
  const isSensitive =
    sensitive ||
    name.toLowerCase().includes("key") ||
    name.toLowerCase().includes("secret") ||
    name.toLowerCase().includes("token") ||
    name.toLowerCase().includes("password")

  const [showValue, setShowValue] = useState(!isSensitive)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-gray-700">
        {name}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          type={isSensitive && !showValue ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={`Enter ${name}`}
          className={cn(
            isSensitive && "pr-10",
            error && "border-red-300 focus-visible:border-red-500"
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${name}-error` : description ? `${name}-desc` : undefined
          }
        />
        {isSensitive && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowValue(!showValue)}
            disabled={disabled}
            aria-label={showValue ? "Hide value" : "Show value"}
          >
            {showValue ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {description && !error && (
        <p id={`${name}-desc`} className="text-xs text-gray-500">
          {description}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
