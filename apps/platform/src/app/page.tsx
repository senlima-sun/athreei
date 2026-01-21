"use client"

import Link from "next/link"
import { useSession } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"

export default function Home() {
  const { data: session, isPending } = useSession()
  const isLoggedIn = !!session?.user

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">athreei Platform</h1>
      <p className="mt-4 text-lg text-gray-600">
        Privacy-focused platform connecting AI apps to browsers via MCP
      </p>
      <nav className="mt-8 flex flex-wrap justify-center gap-4">
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : isLoggedIn ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </main>
  )
}
