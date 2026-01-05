import { AlertCircle } from "lucide-react"

interface ErrorStateProps {
  /** Error message to display */
  message: string
  /** Optional retry handler */
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
      <p className="mt-2 text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm font-medium text-red-700 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}
