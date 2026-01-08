"use client"

import { useToast } from "../hooks/use-toast"
import { Toast, ToastViewport } from "./toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastViewport>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          action={toast.action}
          onClose={() => dismiss(toast.id)}
        />
      ))}
    </ToastViewport>
  )
}
