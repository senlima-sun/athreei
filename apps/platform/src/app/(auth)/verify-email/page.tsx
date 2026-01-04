"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { authClient, useSession } from "@/lib/auth-client"
import { isEmailVerificationEnabled } from "@/lib/api"

export default function VerifyEmailPage() {
  const router = useRouter()
  const { data: session, isPending: isSessionLoading } = useSession()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingFeature, setIsCheckingFeature] = useState(true)

  const userEmail = session?.user?.email

  useEffect(() => {
    // Redirect if email verification is not enabled
    isEmailVerificationEnabled().then((enabled) => {
      if (!enabled) {
        router.replace("/")
      } else {
        setIsCheckingFeature(false)
      }
    })
  }, [router])

  const handleResend = async () => {
    if (!userEmail) {
      setError("No email found. Please sign in again.")
      return
    }

    setIsResending(true)
    setError(null)
    setMessage(null)

    try {
      await authClient.sendVerificationEmail({
        email: userEmail,
        callbackURL: "/dashboard",
      })
      setMessage("Verification email sent! Check your inbox.")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email"
      )
    } finally {
      setIsResending(false)
    }
  }

  const isLoading = isCheckingFeature || isSessionLoading

  if (isLoading) {
    return (
      <AuthLayout title="Loading..." description="">
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Verify your email"
      description="We've sent you a verification link."
    >
      <div className="text-center space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
            {message}
          </div>
        )}
        <p className="text-sm text-gray-600">
          Please check your email{userEmail ? ` (${userEmail})` : ""} and click
          the verification link to activate your account.
        </p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Sending..." : "Resend verification email"}
          </button>
          <Link
            href="/login"
            className="block w-full py-2 px-4 text-center text-sm font-medium text-gray-600 hover:text-gray-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
