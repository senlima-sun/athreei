"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

interface SessionWithImpersonation {
  impersonatedBy?: string
}

export function ImpersonationBanner() {
  const { data: session } = authClient.useSession()

  const sessionData = session?.session as SessionWithImpersonation | undefined
  if (!sessionData?.impersonatedBy) {
    return null
  }

  const stopImpersonating = async () => {
    await authClient.admin.stopImpersonating()
    window.location.href = "/admin/users"
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 text-center text-sm z-50">
      <span className="font-medium">
        You are impersonating {session?.user?.email}
      </span>
      <Button
        variant="link"
        size="sm"
        onClick={stopImpersonating}
        className="ml-4 text-yellow-900 underline hover:text-yellow-800"
      >
        Stop Impersonating
      </Button>
    </div>
  )
}
