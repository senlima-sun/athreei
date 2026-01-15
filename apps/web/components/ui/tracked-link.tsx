"use client"

import Link from "next/link"
import { analytics } from "@/lib/analytics"
import { ComponentProps } from "react"

type TrackedLinkProps = ComponentProps<typeof Link> & {
  trackName: string
  trackLocation: string
  trackVariant?: string
}

export function TrackedLink({
  trackName,
  trackLocation,
  trackVariant,
  onClick,
  children,
  ...props
}: TrackedLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    analytics.trackCTA({
      cta_name: trackName,
      cta_location: trackLocation,
      cta_variant: trackVariant,
      destination: typeof props.href === "string" ? props.href : props.href.toString(),
    })
    onClick?.(e)
  }

  return (
    <Link onClick={handleClick} data-track {...props}>
      {children}
    </Link>
  )
}
