import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/marketing/header"
import { Footer } from "@/components/marketing/footer"
import {
  ArrowRightIcon,
  BrainIcon,
  DownloadIcon,
  KeyIcon,
  LaptopIcon,
  LockIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const metadata: Metadata = {
  title: "Desktop | Athreei",
  description:
    "Manage your memory and context across AI apps. One place to sync, organize, and control what your AI remembers.",
}

const features = [
  {
    icon: BrainIcon,
    title: "One Memory, All AI Apps",
    description:
      "Your context flows seamlessly between Claude, ChatGPT, Cursor, and any MCP-compatible app. No more repeating yourself.",
  },
  {
    icon: RefreshCwIcon,
    title: "Cross-Device Sync",
    description:
      "Start a conversation on your laptop, continue on your desktop. E2E encrypted sync keeps everything in perfect harmony.",
  },
  {
    icon: LockIcon,
    title: "Zero-Knowledge Privacy",
    description:
      "AES-256-GCM encryption with Argon2id key derivation. Your memories are encrypted before they leave your device.",
  },
  {
    icon: SearchIcon,
    title: "Instant Recall",
    description:
      "Full-text search with SQLite FTS5. Find any memory in milliseconds, even with thousands of entries.",
  },
  {
    icon: ZapIcon,
    title: "Offline-First",
    description:
      "Works without internet. Your data lives locally first, syncs when connected. No cloud dependency.",
  },
  {
    icon: KeyIcon,
    title: "You Own Your Data",
    description:
      "Export anytime. No lock-in. Portable backup format you can take anywhere.",
  },
]

const useCases = [
  {
    title: "Context That Follows You",
    description:
      "Save important details once, access them in any AI conversation. Your preferences, project context, and history—always available.",
    example: '"Remember I prefer TypeScript with strict mode..."',
  },
  {
    title: "Cross-App Workflows",
    description:
      "Research in ChatGPT, code in Cursor, review in Claude. Your shared context makes every app smarter.",
    example: '"Based on our earlier discussion about the API design..."',
  },
  {
    title: "Team Knowledge Base",
    description:
      "Sync team decisions, coding standards, and project requirements. Everyone's AI assistant knows the same context.",
    example: '"Our deployment process requires..."',
  },
]

export default function DesktopPage() {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-chart-2/10 via-background to-background" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6">
                <SparklesIcon className="mr-1.5 size-3" />
                Now Available
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                One Memory.
                <span className="mt-1 block bg-gradient-to-r from-chart-2 to-primary bg-clip-text text-transparent">
                  All Your AI Apps.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Stop repeating context to every AI. Athreei Desktop syncs your
                memory across Claude, ChatGPT, Cursor, and any MCP app—encrypted
                and under your control.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/download"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 sm:w-auto"
                >
                  <DownloadIcon className="size-4" />
                  Download for Mac
                </Link>
                <Link
                  href="/docs/desktop"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-8 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
                >
                  View Documentation
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <LaptopIcon className="size-4" />
                  macOS
                </span>
                <span className="flex items-center gap-1.5">
                  <SmartphoneIcon className="size-4" />
                  Windows & Linux soon
                </span>
              </div>
            </div>

            <div className="mx-auto mt-16 max-w-4xl">
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <div className="size-3 rounded-full bg-red-500/60" />
                  <div className="size-3 rounded-full bg-yellow-500/60" />
                  <div className="size-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground">
                    Athreei Desktop
                  </span>
                </div>
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-8">
                  <div className="text-center">
                    <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-primary/10">
                      <BrainIcon className="size-10 text-primary" />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      App screenshot placeholder
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                Features
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Your AI context, finally unified
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Built for developers who use multiple AI tools and want their
                context to follow them everywhere.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                Use Cases
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                How developers use Athreei Desktop
              </h2>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <div
                  key={useCase.title}
                  className="rounded-xl border border-border bg-background p-6"
                >
                  <h3 className="text-lg font-semibold">{useCase.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {useCase.description}
                  </p>
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs italic text-muted-foreground">
                      {useCase.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <ShieldCheckIcon className="mx-auto size-12 text-primary" />
              <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
                Privacy by design
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Your memories are encrypted with your passphrase before they
                ever leave your device. We can&apos;t read them—even if we
                wanted to.
              </p>

              <div className="mt-12 grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <p className="text-2xl font-bold text-primary">AES-256</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Military-grade encryption
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <p className="text-2xl font-bold text-primary">Argon2id</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Memory-hard key derivation
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <p className="text-2xl font-bold text-primary">
                    Zero-Knowledge
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We never see your data
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-chart-2 to-primary px-6 py-16 sm:px-16 sm:py-24">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

              <div className="relative mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to unify your AI memory?
                </h2>
                <p className="mt-4 text-lg text-primary-foreground/80">
                  Download Athreei Desktop and start syncing your context across
                  every AI app. Free forever for personal use.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/download"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90"
                  >
                    <DownloadIcon className="size-4" />
                    Download for Mac
                  </Link>
                  <Link
                    href="/docs/desktop/quickstart"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-8 text-sm font-semibold text-primary-foreground transition-all hover:border-white/50 hover:bg-white/10"
                  >
                    Quick Start Guide
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
