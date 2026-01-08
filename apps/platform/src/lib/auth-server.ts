import { cookies } from "next/headers"
import { API_URL } from "@/constants"
import { isLocalMode } from "./mode"

export async function getServerSession(): Promise<{
  user: { id: string; name: string; email: string } | null
  session: { id: string } | null
}> {
  // Local mode bypass - no authentication required
  if (isLocalMode()) {
    return {
      user: { id: "local", name: "Local User", email: "local@athreei.local" },
      session: { id: "local-session" },
    }
  }

  try {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")

    const response = await fetch(`${API_URL}/api/auth/get-session`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return { user: null, session: null }
    }

    return await response.json()
  } catch (error) {
    console.error("[auth-server] Failed to get session:", error)
    return { user: null, session: null }
  }
}
