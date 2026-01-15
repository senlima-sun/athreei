"use client"

import { useState } from "react"
import {
  CableIcon,
  EyeOffIcon,
  ShieldOffIcon,
  LayersIcon,
  ActivityIcon,
  LockIcon,
  UsersIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const problems = [
  {
    icon: CableIcon,
    title: "Fragmented Connections",
    description:
      "Each AI app needs separate configuration for every MCP server. Managing 10+ servers across multiple apps becomes a nightmare.",
  },
  {
    icon: EyeOffIcon,
    title: "Zero Visibility",
    description:
      "When AI uses your tools, you have no idea what happened. No logs, no traces, no way to debug or audit.",
  },
  {
    icon: ShieldOffIcon,
    title: "Privacy Black Box",
    description:
      "Your data flows through unknown intermediaries. No control over what's stored, shared, or logged.",
  },
]

const solutions = [
  {
    id: "aggregation",
    icon: LayersIcon,
    title: "MCP Aggregation",
    description:
      "Connect all your MCP servers through a single gateway. Tools are automatically namespaced to prevent conflicts. One config, unlimited servers.",
  },
  {
    id: "observability",
    icon: ActivityIcon,
    title: "Full Observability",
    description:
      "Every tool call captured with inputs, outputs, and timing. Search, filter, and analyze AI interactions. Debug issues in seconds.",
  },
  {
    id: "encryption",
    icon: LockIcon,
    title: "E2E Encryption",
    description:
      "Your traces encrypted before leaving your machine. XChaCha20-Poly1305 with Argon2id key derivation. Zero-knowledge sync.",
  },
  {
    id: "teams",
    icon: UsersIcon,
    title: "Team Management",
    description:
      "Workspaces, role-based access, and API keys. Audit logs for compliance. Built for teams shipping AI to production.",
  },
]

export function ProblemSolution() {
  const [activeTab, setActiveTab] = useState("aggregation")
  const activeSolution = solutions.find((s) => s.id === activeTab)

  return (
    <section className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-20">
          <p className="text-sm font-medium uppercase tracking-wider text-destructive">
            The Problem
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            MCP is powerful.
            <span className="text-muted-foreground">
              {" "}Managing it shouldn&apos;t be painful.
            </span>
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {problems.map((problem) => (
              <div
                key={problem.title}
                className="flex gap-4 rounded-xl border border-border/50 bg-card p-5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <problem.icon className="size-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">{problem.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {problem.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            The Solution
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            One gateway.
            <span className="text-primary"> Complete control.</span>
          </h2>

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-12">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:w-[340px] lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
              {solutions.map((solution) => (
                <button
                  key={solution.id}
                  onClick={() => setActiveTab(solution.id)}
                  className={cn(
                    "group flex shrink-0 items-center gap-3 rounded-xl border p-3 text-left transition-all lg:items-start lg:gap-4 lg:p-4",
                    activeTab === solution.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 lg:border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      activeTab === solution.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                  >
                    <solution.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        "whitespace-nowrap font-semibold transition-colors lg:whitespace-normal",
                        activeTab === solution.id
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {solution.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-1 hidden text-sm text-muted-foreground lg:block",
                        activeTab !== solution.id && "lg:hidden"
                      )}
                    >
                      {solution.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="relative flex-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/30 lg:sticky lg:top-24">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                  <div className="size-3 rounded-full bg-red-500/60" />
                  <div className="size-3 rounded-full bg-yellow-500/60" />
                  <div className="size-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-xs text-muted-foreground">
                    athreei — {activeSolution?.title}
                  </span>
                </div>
                <div
                  className="flex aspect-video items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-8 lg:aspect-[4/3]"
                  data-screenshot-placeholder={activeTab}
                >
                  <div className="text-center">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                      {activeSolution && (
                        <activeSolution.icon className="size-8 text-primary" />
                      )}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Screenshot placeholder
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {activeTab}.png
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground lg:hidden">
                {activeSolution?.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
