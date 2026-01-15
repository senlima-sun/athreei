"use client"

import { useState } from "react"
import { Star, MessageSquare, Send, CheckCircle, Loader2 } from "lucide-react"
import type { Trace } from "@/types"

interface TraceEvaluationProps {
  trace: Trace
  apiUrl: string
  organizationId: string
  onEvaluationSubmitted?: () => void
}

export function TraceEvaluation({
  trace,
  apiUrl,
  organizationId,
  onEvaluationSubmitted,
}: TraceEvaluationProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (rating === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(
        `${apiUrl}/api/evaluations?organizationId=${organizationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            traceId: trace.traceId,
            rating,
            feedback: feedback.trim() || null,
            activeSkillIds: trace.activeSkills?.map((s) => s.id) || [],
            activeRuleIds: trace.activeRules?.map((r) => r.id) || [],
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit evaluation")
      }

      setIsSubmitted(true)
      onEvaluationSubmitted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
        <p className="mt-1 text-sm text-green-600">
          Your evaluation helps improve AI responses.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
        <MessageSquare className="h-4 w-4" />
        Rate this response
      </h3>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-gray-600">
            How helpful was this response?
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                className="rounded p-1 transition-colors hover:bg-gray-100"
              >
                <Star
                  className={`h-6 w-6 transition-colors ${
                    value <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 self-center text-sm text-gray-500">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </span>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="feedback"
            className="mb-2 block text-sm text-gray-600"
          >
            Additional feedback (optional)
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What could be improved?"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            {feedback.length}/2000 characters
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {trace.activeSkills && trace.activeSkills.length > 0 && (
              <span>
                {trace.activeSkills.length} skill
                {trace.activeSkills.length !== 1 ? "s" : ""} active
              </span>
            )}
            {trace.activeSkills &&
              trace.activeSkills.length > 0 &&
              trace.activeRules &&
              trace.activeRules.length > 0 && <span className="mx-1">•</span>}
            {trace.activeRules && trace.activeRules.length > 0 && (
              <span>
                {trace.activeRules.length} rule
                {trace.activeRules.length !== 1 ? "s" : ""} active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
