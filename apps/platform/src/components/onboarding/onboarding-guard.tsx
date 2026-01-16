"use client"

import { ReactNode, useEffect, useState } from "react"
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
  const [isRedirecting, setIsRedirecting] = useState(false)

  const isLocalModeActive = isLocalMode()
  const isOnboardingRoute = pathname.startsWith("/onboarding")
  const isLoading = sessionPending || orgsPending
  const isAuthenticated = !!session?.user
  const hasNoOrganizations = !orgList || orgList.length === 0
  const shouldRedirect =
    !isLocalModeActive &&
    !isOnboardingRoute &&
    !isLoading &&
    isAuthenticated &&
    hasNoOrganizations

  useEffect(() => {
    if (shouldRedirect && !isRedirecting) {
      setIsRedirecting(true)
      router.replace("/onboarding")
    } else if (!shouldRedirect && isRedirecting) {
      setIsRedirecting(false)
    }
  }, [shouldRedirect, isRedirecting, router])

  if (isLocalModeActive) {
    return <>{children}</>
  }

  if (isOnboardingRoute) {
    return <>{children}</>
  }

  if (isLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <>{children}</>
  }

  return <>{children}</>
}
