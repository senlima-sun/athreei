const steps = [
  {
    number: "01",
    title: "Install the Gateway",
    description:
      "Download a single binary or install via npm. Works on macOS, Linux, and Windows.",
    code: "curl -fsSL https://get.athreei.dev | sh",
  },
  {
    number: "02",
    title: "Add Your MCP Servers",
    description:
      "Configure your MCP servers via JSON or use our web dashboard. Import existing configs.",
    code: `athreei mcp add --name github \\
  --transport stdio \\
  --command "npx @modelcontextprotocol/server-github"`,
  },
  {
    number: "03",
    title: "Connect Your AI Apps",
    description:
      "Point Claude Desktop, Cursor, or any MCP client to athreei. One connection for everything.",
    code: `{
  "mcpServers": {
    "athreei": {
      "command": "athreei",
      "args": ["gateway", "start"]
    }
  }
}`,
  },
  {
    number: "04",
    title: "See Everything",
    description:
      "Watch tool calls flow through your dashboard. Search traces, debug issues, audit usage.",
    code: "athreei traces list --last 24h",
  },
]

export function HowItWorks() {
  return (
    <section className="border-t border-border/40 bg-muted/30 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Getting Started
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No complex setup. No vendor lock-in. Just a simple gateway that
            works.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative grid gap-6 lg:grid-cols-2 lg:gap-12"
              >
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-16 hidden h-[calc(100%+3rem)] w-px bg-gradient-to-b from-primary/50 to-transparent lg:block" />
                )}

                <div className="flex gap-4 lg:gap-6">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-[#1a1a1a] lg:ml-0">
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
                    <div className="size-3 rounded-full bg-red-500/80" />
                    <div className="size-3 rounded-full bg-yellow-500/80" />
                    <div className="size-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-xs text-white/50">Terminal</span>
                  </div>
                  <pre className="overflow-x-auto p-4 text-sm">
                    <code className="text-green-400">{step.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
