"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      await authClient.sendVerificationEmail({
        email: "", // The server should use the session email
        callbackURL: "/",
      });
      setMessage("Verification email sent! Check your inbox.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email"
      );
    } finally {
      setIsResending(false);
    }
  };

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
          Please check your email and click the verification link to activate
          your account.
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
  );
}
