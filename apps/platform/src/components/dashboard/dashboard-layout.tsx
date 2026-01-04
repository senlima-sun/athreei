"use client"

import { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { UserMenu } from "./user-menu"
import { Breadcrumbs } from "./breadcrumbs"
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <OnboardingGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="lg:pl-64">
          {/* Top header bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8">
            {/* Left side - breadcrumbs (hidden on mobile to make room for hamburger) */}
            <div className="hidden lg:block">
              <Breadcrumbs />
            </div>

            {/* Mobile spacer for hamburger menu */}
            <div className="lg:hidden" />

            {/* Right side - user menu */}
            <div className="ml-auto">
              <UserMenu />
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </OnboardingGuard>
  )
}
