import { ReactNode } from "react"

interface OnboardingLayoutProps {
  children: ReactNode
}

/**
 * Onboarding Layout - Minimal centered layout for onboarding flow.
 * No sidebar or dashboard chrome, focused on the wizard experience.
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Logo header */}
      <header className="py-8">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">athreei</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-start justify-center px-4 pb-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  )
}
