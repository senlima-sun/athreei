"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useListOrganizations, useSession } from "@/lib/auth-client";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Loader2 } from "lucide-react";

/**
 * Onboarding Page - Entry point for the onboarding wizard.
 *
 * Guards against:
 * 1. Unauthenticated users (redirects to login)
 * 2. Users who already have organizations (redirects to dashboard)
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: orgList, isPending: orgsPending } = useListOrganizations();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!sessionPending && !session?.user) {
      router.replace("/login");
      return;
    }

    // Redirect to dashboard if user already has organizations
    if (!orgsPending && orgList && orgList.length > 0) {
      router.replace("/dashboard");
    }
  }, [session, sessionPending, orgList, orgsPending, router]);

  // Show loading while checking auth state
  if (sessionPending || orgsPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Don't render wizard if user is not authenticated
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Don't render wizard if user already has organizations (redirecting)
  if (orgList && orgList.length > 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <OnboardingWizard />;
}
