"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";
import { getConfig } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingFeature, setIsCheckingFeature] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Redirect if password reset is not enabled
    getConfig().then((config) => {
      if (!config.features.passwordReset) {
        router.replace("/login");
      } else {
        setIsCheckingFeature(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingFeature) {
    return (
      <AuthLayout title="Loading..." description="">
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      </AuthLayout>
    );
  }

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check your email"
        description="We've sent you a password reset link."
      >
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            If an account exists for {email}, you will receive a password reset
            link shortly.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-gray-900 hover:text-gray-700"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      description="No worries, we'll send you reset instructions."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send reset link"}
        </button>
        <p className="text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="font-medium text-gray-900 hover:text-gray-700"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
