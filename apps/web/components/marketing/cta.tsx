import { ArrowRightIcon, DownloadIcon } from "lucide-react"
import { TrackedLink } from "@/components/ui/tracked-link"

export function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-chart-3 px-6 py-16 sm:px-16 sm:py-24">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to take control?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Start free with our self-hosted option or try the managed cloud.
              No credit card required.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TrackedLink
                href="/signup"
                trackName="start_platform"
                trackLocation="cta_section"
                trackVariant="primary"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90"
              >
                Start with Platform
                <ArrowRightIcon className="size-4" />
              </TrackedLink>
              <TrackedLink
                href="/desktop"
                trackName="download_desktop"
                trackLocation="cta_section"
                trackVariant="secondary"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-8 text-sm font-semibold text-primary-foreground transition-all hover:border-white/50 hover:bg-white/10"
              >
                <DownloadIcon className="size-4" />
                Download Desktop
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
