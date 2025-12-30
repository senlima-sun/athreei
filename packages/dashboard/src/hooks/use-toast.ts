import * as React from "react"

export type ToastVariant = "default" | "success" | "warning" | "error" | "info"

export interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  action?: React.ReactNode
  duration?: number
}

type ToastActionType =
  | { type: "ADD_TOAST"; toast: ToastData }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastData> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId: string }
  | { type: "REMOVE_TOAST"; toastId: string }

interface ToastState {
  toasts: ToastData[]
}

const TOAST_LIMIT = 5

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

function reducer(state: ToastState, action: ToastActionType): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    }

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }

    default:
      return state
  }
}

const listeners: Array<(state: ToastState) => void> = []

let memoryState: ToastState = { toasts: [] }

function dispatch(action: ToastActionType) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

export type ToastInput = Omit<ToastData, "id">

function toast({ ...props }: ToastInput) {
  const id = genId()
  const duration = props.duration ?? 5000

  const update = (updatedProps: Partial<ToastData>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...updatedProps, id },
    })

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
    },
  })

  // Auto dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      dismiss()
    }, duration)
  }

  return {
    id,
    dismiss,
    update,
  }
}

// Convenience methods
toast.success = (props: Omit<ToastInput, "variant">) =>
  toast({ ...props, variant: "success" })

toast.error = (props: Omit<ToastInput, "variant">) =>
  toast({ ...props, variant: "error" })

toast.warning = (props: Omit<ToastInput, "variant">) =>
  toast({ ...props, variant: "warning" })

toast.info = (props: Omit<ToastInput, "variant">) =>
  toast({ ...props, variant: "info" })

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
