"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"

interface PageParams {
  slug: string
}

export default function RegistryDetailRedirectPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { slug } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/marketplace/public-mcp-servers/${slug}`)
  }, [router, slug])

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-gray-500">Redirecting to Marketplace...</p>
    </div>
  )
}
