"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function RegistryRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const search = searchParams.get("search")
    const category = searchParams.get("category")

    const params = new URLSearchParams()
    params.set("componentType", "mcp_server")
    params.set("marketplace", "public-mcp-servers")

    if (search) {
      params.set("search", search)
    }
    if (category) {
      params.set("category", category)
    }

    router.replace(`/dashboard/marketplace?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-gray-500">Redirecting to Marketplace...</p>
    </div>
  )
}
