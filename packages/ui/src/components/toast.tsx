"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "../lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        success: "border-success/50 bg-success/10 text-success",
        warning: "border-warning/50 bg-warning/10 text-warning",
        error: "border-destructive/50 bg-destructive/10 text-destructive",
        info: "border-info/50 bg-info/10 text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  onClose?: () => void
}

export function Toast({
  className,
  variant,
  title,
  description,
  action,
  onClose,
  ...props
}: ToastProps) {
  return (
    <div className={cn(toastVariants({ variant }), className)} {...props}>
      <div className="flex-1 space-y-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export interface ToastViewportProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ToastViewport({ className, ...props }: ToastViewportProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]",
        className
      )}
      {...props}
    />
  )
}
