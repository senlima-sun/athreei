"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { TrackedLink } from "@/components/ui/tracked-link"
import { ArrowRightIcon, PlayIcon, GithubIcon } from "lucide-react"

function AggregationDiagram() {
  return (
    <div className="relative mx-auto mt-16 w-full max-w-4xl">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <svg
        viewBox="0 0 800 400"
        className="w-full"
        aria-label="athreei aggregation diagram"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor="oklch(0.646 0.222 41.116)"
              stopOpacity="0.2"
            />
            <stop
              offset="50%"
              stopColor="oklch(0.646 0.222 41.116)"
              stopOpacity="0.8"
            />
            <stop
              offset="100%"
              stopColor="oklch(0.646 0.222 41.116)"
              stopOpacity="0.2"
            />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="ai-apps">
          <g className="animate-fade-in" style={{ animationDelay: "0ms" }}>
            <rect
              x="40"
              y="60"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="100"
              y="90"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Claude Desktop
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <rect
              x="40"
              y="130"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="100"
              y="160"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Cursor
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <rect
              x="40"
              y="200"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="100"
              y="230"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              ChatGPT
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <rect
              x="40"
              y="270"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="100"
              y="300"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Your AI App
            </text>
          </g>
        </g>

        <g className="connection-lines-left">
          <path
            d="M160 85 Q 250 85 300 190"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "400ms" }}
          />
          <path
            d="M160 155 Q 230 155 300 190"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "500ms" }}
          />
          <path
            d="M160 225 Q 230 225 300 210"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "600ms" }}
          />
          <path
            d="M160 295 Q 250 295 300 210"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "700ms" }}
          />
        </g>

        <g
          className="gateway animate-scale-in"
          style={{ animationDelay: "800ms" }}
        >
          <rect
            x="300"
            y="150"
            width="200"
            height="100"
            rx="12"
            className="fill-primary"
            filter="url(#glow)"
          />
          <rect
            x="305"
            y="155"
            width="190"
            height="90"
            rx="10"
            className="fill-primary"
          />
          <text
            x="400"
            y="195"
            textAnchor="middle"
            className="fill-primary-foreground text-sm font-semibold"
          >
            athreei
          </text>
          <text
            x="400"
            y="215"
            textAnchor="middle"
            className="fill-primary-foreground/80 text-xs"
          >
            Gateway
          </text>
        </g>

        <g className="connection-lines-right">
          <path
            d="M500 170 Q 550 170 580 85"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "1000ms" }}
          />
          <path
            d="M500 185 Q 560 185 580 155"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "1100ms" }}
          />
          <path
            d="M500 200 Q 560 200 580 225"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "1200ms" }}
          />
          <path
            d="M500 215 Q 560 215 580 295"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "1300ms" }}
          />
          <path
            d="M500 230 Q 550 270 580 365"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
            style={{ animationDelay: "1400ms" }}
          />
        </g>

        <g className="mcp-servers">
          <g className="animate-fade-in" style={{ animationDelay: "1100ms" }}>
            <rect
              x="580"
              y="60"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="640"
              y="90"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              GitHub
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "1200ms" }}>
            <rect
              x="580"
              y="130"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="640"
              y="160"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Figma
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "1300ms" }}>
            <rect
              x="580"
              y="200"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="640"
              y="230"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Sentry
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "1400ms" }}>
            <rect
              x="580"
              y="270"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="640"
              y="300"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Linear
            </text>
          </g>
          <g className="animate-fade-in" style={{ animationDelay: "1500ms" }}>
            <rect
              x="580"
              y="340"
              width="120"
              height="50"
              rx="8"
              className="fill-muted stroke-border"
              strokeWidth="1"
            />
            <text
              x="640"
              y="370"
              textAnchor="middle"
              className="fill-foreground text-xs font-medium"
            >
              Your MCP Server
            </text>
          </g>
        </g>

        <g className="labels">
          <text
            x="100"
            y="35"
            textAnchor="middle"
            className="fill-muted-foreground text-xs uppercase tracking-wider"
          >
            AI Apps
          </text>
          <text
            x="400"
            y="130"
            textAnchor="middle"
            className="fill-muted-foreground text-xs uppercase tracking-wider"
          >
            Single Connection
          </text>
          <text
            x="640"
            y="35"
            textAnchor="middle"
            className="fill-muted-foreground text-xs uppercase tracking-wider"
          >
            MCP Servers
          </text>
        </g>
      </svg>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <GithubIcon className="size-3.5" />
              Open Source
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              v0.1.0
            </Badge>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block">Aggregate Toolset.</span>
            <span className="mt-1 block bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Manage Memory.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Open source platform that unifies your AI tools and syncs your
            memory across every AI app. Full control, complete privacy.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <TrackedLink
              href="/desktop"
              trackName="download_desktop"
              trackLocation="hero"
              trackVariant="primary"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Download Desktop
              <ArrowRightIcon className="size-4" />
            </TrackedLink>
            <TrackedLink
              href="/platform"
              trackName="explore_platform"
              trackLocation="hero"
              trackVariant="secondary"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
            >
              <PlayIcon className="size-4" />
              Explore Platform
            </TrackedLink>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Free forever · Self-host or cloud · E2E encrypted
          </p>
        </div>

        <AggregationDiagram />

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {[
            { value: "100%", label: "Open Source" },
            { value: "E2E", label: "Encrypted" },
            { value: "∞", label: "AI Apps" },
            { value: "0", label: "Lock-in" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-primary sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
