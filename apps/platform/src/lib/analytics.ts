interface CTAEvent {
  cta_name: string
  cta_location: string
  cta_variant?: string
  destination: string
}

export const analytics = {
  trackCTA: (_event: CTAEvent) => {
    // Placeholder for analytics implementation
  },
}
