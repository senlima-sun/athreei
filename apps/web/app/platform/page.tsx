"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/marketing/header"
import { Footer } from "@/components/marketing/footer"
import {
  ActivityIcon,
  ArrowRightIcon,
  CloudIcon,
  GithubIcon,
  LayersIcon,
  LockIcon,
  ServerIcon,
  TagIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const features = [
  {
    id: "aggregation",
    icon: LayersIcon,
    title: "MCP Aggregation",
    tagline: "One connection. All your tools.",
    description:
      "Connect all your MCP servers through a single gateway. Your AI apps see one unified interface while athreei handles routing to GitHub, Figma, Sentry, Linear, and your custom servers.",
    benefits: [
      "Single MCP connection for AI apps",
      "Automatic tool discovery",
      "Hot-reload server changes",
      "Support for stdio, SSE, HTTP transports",
    ],
  },
  {
    id: "observability",
    icon: ActivityIcon,
    title: "Full Observability",
    tagline: "See what your AI is doing.",
    description:
      "Every tool call captured with inputs, outputs, and timing. Search, filter, and analyze AI interactions in real-time. Debug issues in seconds, not hours.",
    benefits: [
      "Complete trace timeline",
      "Search by tool, inputs, outputs",
      "Performance metrics",
      "Audit logs for compliance",
    ],
  },
  {
    id: "namespacing",
    icon: TagIcon,
    title: "Tool Namespacing",
    tagline: "No more naming conflicts.",
    description:
      "When you have multiple servers with similar tools, athreei automatically namespaces them. github__create_issue and linear__create_issue live peacefully together.",
    benefits: [
      "Automatic prefix: server__tool",
      "Clear tool origin identification",
      "Unified tool list for AI apps",
      "Zero configuration required",
    ],
  },
  {
    id: "encryption",
    icon: LockIcon,
    title: "E2E Encryption",
    tagline: "Your traces, your eyes only.",
    description:
      "Traces encrypted with XChaCha20-Poly1305 before leaving your machine. Your data syncs to the cloud encrypted—we can't read it, even if we wanted to.",
    benefits: [
      "XChaCha20-Poly1305 AEAD",
      "Argon2id key derivation",
      "Zero-knowledge sync",
      "Client-side encryption",
    ],
  },
  {
    id: "deployment",
    icon: ServerIcon,
    title: "Self-Host or Cloud",
    tagline: "Your infrastructure, your choice.",
    description:
      "Run the gateway as a single binary on your machine, or use our managed cloud. Same features, same API—just different hosting.",
    benefits: [
      "Single binary deployment",
      "No cloud dependencies for local",
      "Managed cloud option",
      "Horizontal scaling (cloud)",
    ],
  },
  {
    id: "teams",
    icon: UsersIcon,
    title: "Team Collaboration",
    tagline: "Built for teams shipping AI.",
    description:
      "Workspaces, role-based access, and API keys. Share server configurations, collaborate on tool setups, and maintain audit trails for compliance.",
    benefits: [
      "Multi-workspace support",
      "Role-based access control",
      "API key management",
      "Team audit logs",
    ],
  },
]

function FeatureTab({
  feature,
  isActive,
  onClick,
}: {
  feature: (typeof features)[0]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex shrink-0 items-center gap-3 rounded-xl border p-3 text-left transition-all lg:w-full lg:gap-4 lg:p-4",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border/50 bg-card hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        <feature.icon className="size-5" />
      </div>
      <div className="min-w-0">
        <h3
          className={cn(
            "whitespace-nowrap font-semibold transition-colors lg:whitespace-normal",
            isActive
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        >
          {feature.title}
        </h3>
        <p
          className={cn(
            "mt-0.5 hidden text-sm text-muted-foreground lg:block",
            !isActive && "lg:hidden"
          )}
        >
          {feature.tagline}
        </p>
      </div>
    </button>
  )
}

function FeatureContent({ feature }: { feature: (typeof features)[0] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <div className="size-3 rounded-full bg-red-500/60" />
        <div className="size-3 rounded-full bg-yellow-500/60" />
        <div className="size-3 rounded-full bg-green-500/60" />
        <span className="ml-2 text-xs text-muted-foreground">
          athreei — {feature.title}
        </span>
      </div>

      <div className="p-6 lg:p-8">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <feature.icon className="size-7 text-primary" />
        </div>

        <h3 className="mt-6 text-2xl font-bold">{feature.tagline}</h3>
        <p className="mt-3 text-muted-foreground">{feature.description}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {feature.benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ZapIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex aspect-video items-center justify-center rounded-xl bg-muted/50">
          <div className="text-center">
            <feature.icon className="mx-auto size-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Screenshot: {feature.id}.png
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlatformPage() {
  const [activeFeature, setActiveFeature] = useState("aggregation")
  const currentFeature =
    features.find((f) => f.id === activeFeature) || features[0]

  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 flex items-center justify-center gap-3">
                <Badge variant="outline" className="gap-1.5">
                  <GithubIcon className="size-3" />
                  Open Source
                </Badge>
                <Badge variant="secondary">Self-host or Cloud</Badge>
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                The Unified
                <span className="mt-1 block bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  MCP Gateway
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Connect all your MCP servers through one gateway. Full
                observability, E2E encryption, and complete control over your AI
                tool integrations.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/docs/platform/quickstart"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 sm:w-auto"
                >
                  Get Started
                  <ArrowRightIcon className="size-4" />
                </Link>
                <Link
                  href="https://github.com/athreei/athreei"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-8 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
                >
                  <GithubIcon className="size-4" />
                  View on GitHub
                </Link>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Free self-hosted · Managed cloud available
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                Platform Features
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to manage MCP at scale
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Built for developers and teams who need visibility and control
                over their AI tool integrations.
              </p>
            </div>

            <div className="mt-16 flex flex-col gap-8 lg:flex-row lg:gap-12">
              <div className="flex gap-2 overflow-x-auto pb-2 lg:w-[320px] lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
                {features.map((feature) => (
                  <FeatureTab
                    key={feature.id}
                    feature={feature}
                    isActive={activeFeature === feature.id}
                    onClick={() => setActiveFeature(feature.id)}
                  />
                ))}
              </div>

              <div className="flex-1">
                <FeatureContent feature={currentFeature} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                How It Works
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                One gateway, unlimited servers
              </h2>
            </div>

            <div className="mx-auto mt-16 max-w-4xl">
              <div className="grid gap-8 sm:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <span className="text-2xl font-bold">1</span>
                  </div>
                  <h3 className="mt-4 font-semibold">Configure Servers</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add your MCP servers via JSON config or the dashboard.
                    stdio, SSE, or HTTP—all supported.
                  </p>
                </div>

                <div className="text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <span className="text-2xl font-bold">2</span>
                  </div>
                  <h3 className="mt-4 font-semibold">Connect Once</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Point your AI app to athreei. One connection gives you
                    access to all your servers.
                  </p>
                </div>

                <div className="text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <span className="text-2xl font-bold">3</span>
                  </div>
                  <h3 className="mt-4 font-semibold">Observe & Iterate</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Watch traces in real-time. Spot issues, tweak tool
                    descriptions, and improve your AI workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-8">
                <ServerIcon className="size-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Self-Hosted</h3>
                <p className="mt-2 text-muted-foreground">
                  Single binary. No cloud required. Run completely offline with
                  full functionality.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Zero external dependencies
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    File-based configuration
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Optional cloud sync
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Free forever
                  </li>
                </ul>
                <Link
                  href="/docs/platform/self-host"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Self-host guide
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-primary/50 bg-gradient-to-br from-primary/5 to-transparent p-8">
                <CloudIcon className="size-10 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Managed Cloud</h3>
                <p className="mt-2 text-muted-foreground">
                  We handle the infrastructure. You focus on building. Same
                  features, zero ops.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Automatic scaling
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Multi-region deployment
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Team collaboration
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <ZapIcon className="size-4 text-primary" />
                    Priority support
                  </li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Start free trial
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-chart-3 px-6 py-16 sm:px-16 sm:py-24">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

              <div className="relative mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to unify your MCP servers?
                </h2>
                <p className="mt-4 text-lg text-primary-foreground/80">
                  Get started in minutes. Self-host for free or try the managed
                  cloud.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/docs/platform/quickstart"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90"
                  >
                    Quick Start Guide
                    <ArrowRightIcon className="size-4" />
                  </Link>
                  <Link
                    href="https://github.com/athreei/athreei"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-white/30 px-8 text-sm font-semibold text-primary-foreground transition-all hover:border-white/50 hover:bg-white/10"
                  >
                    <GithubIcon className="size-4" />
                    Star on GitHub
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
