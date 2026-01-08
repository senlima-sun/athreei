"use client"

import { ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useListOrganizations, useSession } from "@/lib/auth-client"
import { isLocalMode } from "@/lib/mode"
import { Loader2 } from "lucide-react"

interface OnboardingGuardProps {
  children: ReactNode
}

/**
 * OnboardingGuard - Redirects users to onboarding if they have no organizations.
 *
 * This component wraps dashboard content and ensures users complete the onboarding
 * flow (creating their first organization) before accessing the dashboard.
 *
 * In local mode, this guard is bypassed entirely.
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending: sessionPending } = useSession()
  const { data: orgList, isPending: orgsPending } = useListOrganizations()

  // Local mode bypass - no onboarding required
  if (isLocalMode()) {
    return <>{children}</>
  }

  // Skip check if already on onboarding route
  if (pathname.startsWith("/onboarding")) {
    return <>{children}</>
  }

  // Show loading while checking auth state
  if (sessionPending || orgsPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Not authenticated - let auth guards handle this
  if (!session?.user) {
    return <>{children}</>
  }

  // User has no organizations - redirect to onboarding
  if (!orgList || orgList.length === 0) {
    router.replace("/onboarding")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // User has organizations - allow access
  return <>{children}</>
}
