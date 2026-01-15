import posthog from "posthog-js"

type CTAEvent = {
  cta_name: string
  cta_location: string
  cta_variant?: string
  destination?: string
}

type FeatureEvent = {
  feature_name: string
  feature_tab?: string
}

export const analytics = {
  trackCTA: (event: CTAEvent) => {
    posthog.capture("cta_clicked", event)
  },

  trackFeatureView: (event: FeatureEvent) => {
    posthog.capture("feature_viewed", event)
  },

  trackDownload: (platform: string) => {
    posthog.capture("download_initiated", { platform })
  },

  trackSignup: (source: string) => {
    posthog.capture("signup_started", { source })
  },

  identify: (userId: string, properties?: Record<string, unknown>) => {
    posthog.identify(userId, properties)
  },

  reset: () => {
    posthog.reset()
  },
}
