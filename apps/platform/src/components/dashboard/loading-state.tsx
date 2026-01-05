import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  /** Optional message to display below spinner */
  message?: string
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
    </div>
  )
}
