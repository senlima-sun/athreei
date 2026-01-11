import * as React from "react"
import { Popover as BasePopover } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

type PopoverProps = React.ComponentProps<typeof BasePopover.Root>

function Popover({ ...props }: PopoverProps): React.ReactElement {
  return <BasePopover.Root data-slot="popover" {...props} />
}

type PopoverTriggerProps = React.ComponentProps<typeof BasePopover.Trigger>

function PopoverTrigger({
  className,
  ...props
}: PopoverTriggerProps): React.ReactElement {
  return (
    <BasePopover.Trigger
      data-slot="popover-trigger"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

type PopoverContentProps = React.ComponentProps<typeof BasePopover.Popup> & {
  sideOffset?: number
  align?: "start" | "center" | "end"
}

function PopoverContent({
  className,
  sideOffset = 4,
  align = "center",
  ...props
}: PopoverContentProps): React.ReactElement {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset} align={align}>
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  )
}

type PopoverCloseProps = React.ComponentProps<typeof BasePopover.Close>

function PopoverClose({
  className,
  ...props
}: PopoverCloseProps): React.ReactElement {
  return (
    <BasePopover.Close
      data-slot="popover-close"
      className={cn(className)}
      {...props}
    />
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverClose }
