"use client"

import * as React from "react"
import { ShieldCheck } from "lucide-react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

interface VerifiedBadgeProps {
  className?: string
}

export function VerifiedBadge({ className }: VerifiedBadgeProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          className={cn(
            "inline-flex cursor-default items-center text-blue-500",
            className
          )}
        >
          <ShieldCheck className="h-4 w-4" />
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner sideOffset={4}>
            <TooltipPrimitive.Popup className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
              Verified by athreei team
              <TooltipPrimitive.Arrow className="fill-gray-900" />
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
