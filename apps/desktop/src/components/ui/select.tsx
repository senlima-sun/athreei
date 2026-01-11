import * as React from "react"
import { Select as BaseSelect } from "@base-ui/react/select"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const selectTriggerVariants = cva(
  "inline-flex w-full items-center justify-between gap-2 rounded-md text-sm transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-foreground placeholder:text-muted-foreground focus-visible:bg-accent focus-visible:ring-1 focus-visible:ring-ring",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 focus-visible:ring-1 focus-visible:ring-ring",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        default: "h-9 px-3",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SelectProps<Value = string> extends Omit<
  React.ComponentProps<typeof BaseSelect.Root<Value, false>>,
  "onValueChange"
> {
  onValueChange?: (value: Value | null) => void
}

function Select<Value = string>({
  onValueChange,
  ...props
}: SelectProps<Value>): React.ReactElement {
  return (
    <BaseSelect.Root
      data-slot="select"
      onValueChange={
        onValueChange ? (value) => onValueChange(value) : undefined
      }
      {...props}
    />
  )
}

interface SelectTriggerProps
  extends
    React.ComponentProps<typeof BaseSelect.Trigger>,
    VariantProps<typeof selectTriggerVariants> {}

function SelectTrigger({
  className,
  variant,
  size,
  children,
  ...props
}: SelectTriggerProps): React.ReactElement {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ variant, size, className }))}
      {...props}
    >
      {children}
      <BaseSelect.Icon
        data-slot="select-icon"
        className="shrink-0 text-muted-foreground"
      >
        <ChevronDown className="size-4" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  )
}

interface SelectValueProps extends React.ComponentProps<
  typeof BaseSelect.Value
> {
  placeholder?: string
}

function SelectValue({
  className,
  placeholder,
  children,
  ...props
}: SelectValueProps): React.ReactElement {
  return (
    <BaseSelect.Value
      data-slot="select-value"
      className={cn("truncate", className)}
      {...props}
    >
      {children}
    </BaseSelect.Value>
  )
}

type SelectContentProps = React.ComponentProps<typeof BaseSelect.Popup>

function SelectContent({
  className,
  children,
  ...props
}: SelectContentProps): React.ReactElement {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner>
        <BaseSelect.Popup
          data-slot="select-content"
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          {...props}
        >
          <BaseSelect.List data-slot="select-list">{children}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  )
}

type SelectItemProps = React.ComponentProps<typeof BaseSelect.Item>

function SelectItem({
  className,
  children,
  ...props
}: SelectItemProps): React.ReactElement {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[selected]:bg-accent/50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <BaseSelect.ItemIndicator>
          <Check className="size-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  )
}

type SelectGroupProps = React.ComponentProps<typeof BaseSelect.Group>

function SelectGroup({
  className,
  ...props
}: SelectGroupProps): React.ReactElement {
  return (
    <BaseSelect.Group
      data-slot="select-group"
      className={cn("p-1", className)}
      {...props}
    />
  )
}

type SelectGroupLabelProps = React.ComponentProps<typeof BaseSelect.GroupLabel>

function SelectGroupLabel({
  className,
  ...props
}: SelectGroupLabelProps): React.ReactElement {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-group-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

type SelectSeparatorProps = React.HTMLAttributes<HTMLDivElement>

function SelectSeparator({
  className,
  ...props
}: SelectSeparatorProps): React.ReactElement {
  return (
    <div
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectGroupLabel,
  SelectSeparator,
}
