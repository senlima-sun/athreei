import {
  LayersIcon,
  ActivityIcon,
  UsersIcon,
  KeyIcon,
  ServerIcon,
  LockIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: ActivityIcon,
    title: "Full Observability",
    description:
      "Every tool call captured with inputs, outputs, and timing. Search, filter, and analyze AI interactions in real-time.",
    size: "large",
    highlight: true,
  },
  {
    icon: LayersIcon,
    title: "MCP Aggregation",
    description:
      "Connect multiple MCP servers through a single gateway. Tools automatically namespaced.",
    size: "medium",
  },
  {
    icon: LockIcon,
    title: "E2E Encryption",
    description:
      "XChaCha20-Poly1305 with Argon2id key derivation for sensitive traces.",
    size: "medium",
  },
  {
    icon: UsersIcon,
    title: "Team Collaboration",
    description:
      "Workspaces, teams, and role-based access control for enterprise security.",
    size: "small",
  },
  {
    icon: KeyIcon,
    title: "API Keys",
    description: "Programmatic access with permissions and usage limits.",
    size: "small",
  },
  {
    icon: ServerIcon,
    title: "Self-Host or Cloud",
    description: "Single binary or managed cloud. Your infrastructure, your choice.",
    size: "small",
  },
]

function FeatureCard({
  feature,
  className,
}: {
  feature: (typeof features)[0]
  className?: string
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg",
        feature.highlight && "bg-gradient-to-br from-primary/5 to-transparent",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl transition-colors",
          feature.size === "large"
            ? "size-14 bg-primary text-primary-foreground"
            : "size-12 bg-primary/10 group-hover:bg-primary/20"
        )}
      >
        <feature.icon
          className={cn(
            feature.size === "large"
              ? "size-7 text-primary-foreground"
              : "size-6 text-primary"
          )}
        />
      </div>
      <h3
        className={cn(
          "mt-4 font-semibold",
          feature.size === "large" ? "text-xl" : "text-lg"
        )}
      >
        {feature.title}
      </h3>
      <p
        className={cn(
          "mt-2 text-muted-foreground",
          feature.size === "large" ? "text-base" : "text-sm"
        )}
      >
        {feature.description}
      </p>
    </div>
  )
}

export function Features() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Platform Features
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage MCP at scale
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built for developers and teams who need visibility and control over
            their AI tool integrations.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              feature={features[0]}
              className="md:col-span-2 lg:row-span-2"
            />

            <FeatureCard feature={features[1]} className="lg:col-span-2" />

            <FeatureCard feature={features[2]} className="lg:col-span-2" />

            <FeatureCard feature={features[3]} />

            <FeatureCard feature={features[4]} />

            <FeatureCard feature={features[5]} className="md:col-span-2 lg:col-span-2" />
          </div>
        </div>
      </div>
    </section>
  )
}
