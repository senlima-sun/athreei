import Link from "next/link"
import {
  Lock,
  GitMerge,
  Globe,
  Zap,
  Wrench,
  Shield,
  Github,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionItem } from "@/components/ui/accordion"

const DOCS_URL = "https://docs.athreei.com"

// Feature data
const features = [
  {
    icon: Lock,
    title: "Privacy First",
    description:
      "All data stays on your machine. No cloud processing. End-to-end encryption for optional sync between devices.",
  },
  {
    icon: GitMerge,
    title: "MCP Aggregation",
    description:
      "Connect multiple MCP servers through a single gateway. Browser tools, file access, databases - all in one place.",
  },
  {
    icon: Globe,
    title: "Cross-Platform",
    description:
      "Works on macOS, Windows, and Linux. Native binaries for each platform with automatic updates.",
  },
  {
    icon: Zap,
    title: "Zero Config",
    description:
      "Install the extension, configure your AI app, and start using browser tools immediately. No complex setup required.",
  },
  {
    icon: Wrench,
    title: "Fully Extensible",
    description:
      "Add any MCP-compatible server. Build custom tools. Integrate with your existing workflow.",
  },
  {
    icon: Shield,
    title: "Open Source",
    description:
      "Audit the code yourself. Contribute improvements. No vendor lock-in, ever.",
  },
]

// FAQ data
const faqs = [
  {
    question: "Is athreei really free?",
    answer:
      "Yes! The core functionality is completely free and always will be. The local MCP server, browser extension, and basic automation tools are free and open source. Paid plans add cloud sync and team features.",
  },
  {
    question: "Does my data go to Anthropic or OpenAI?",
    answer:
      "athreei itself never sends your data anywhere. When you use Claude or ChatGPT with athreei, the AI only sees the specific content you authorize through MCP. Your browsing history and other data stays completely local.",
  },
  {
    question: "Which browsers are supported?",
    answer:
      "Currently, athreei supports Chrome and Chromium-based browsers (Edge, Brave, Arc). Firefox support is planned for a future release.",
  },
  {
    question: "Can I use athreei with my own MCP servers?",
    answer:
      "Absolutely! athreei acts as an MCP aggregation gateway. You can add any MCP-compatible server alongside the browser tools. This lets you give your AI access to files, databases, APIs, and your browser all through one connection.",
  },
  {
    question: "Is it safe to let AI control my browser?",
    answer:
      "athreei includes multiple safety features: permission controls, domain whitelisting, action confirmations, and the ability to set read-only mode. You stay in control of what your AI can access and do.",
  },
  {
    question: "What AI assistants work with athreei?",
    answer:
      "Any AI assistant that supports MCP works with athreei. This includes Claude Desktop, ChatGPT (with MCP plugins), Cursor, and many other developer tools. Check our documentation for specific setup guides.",
  },
]

// Security features
const securityFeatures = [
  {
    title: "Local Processing",
    description:
      "All MCP communication happens locally on your machine. Your browser data never touches our servers.",
  },
  {
    title: "E2E Encryption",
    description:
      "Optional cross-device sync uses XChaCha20-Poly1305 encryption. Only you hold the keys.",
  },
  {
    title: "Permission Controls",
    description:
      "Fine-grained permissions let you control exactly what your AI can access. Whitelist specific domains.",
  },
  {
    title: "Open Source",
    description:
      "Every line of code is auditable. Security researchers welcome. Bug bounty program available.",
  },
]

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary to-background px-6 py-24 text-center lg:py-32">
        {/* Background glow effect */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <Badge className="mb-6">Privacy-First AI Integration</Badge>

          <h1 className="mb-6 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-5xl font-bold tracking-tight text-transparent lg:text-6xl">
            Connect AI to Your Browser
          </h1>

          <p className="mb-10 text-lg text-muted-foreground lg:text-xl">
            Give Claude, ChatGPT, and other AI assistants secure access to your
            browser through the Model Context Protocol. Your data stays local,
            always.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href={`${DOCS_URL}/docs/user-guide`}>Get Started Free</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href={DOCS_URL}>View Documentation</Link>
            </Button>
          </div>

          <div className="mt-12 text-sm text-muted-foreground">
            <span>Works with:</span>
            <div className="mt-3 flex flex-wrap justify-center gap-6">
              <span className="font-medium text-foreground/80">
                Claude Desktop
              </span>
              <span className="font-medium text-foreground/80">ChatGPT</span>
              <span className="font-medium text-foreground/80">Cursor</span>
              <span className="font-medium text-foreground/80">
                Any MCP Client
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 lg:py-28" id="features">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
              Why athreei?
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for developers who care about privacy and flexibility
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-3 h-8 w-8 text-primary" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        className="bg-secondary/50 px-6 py-20 lg:py-28"
        id="how-it-works"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple architecture, powerful capabilities
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="mb-16 flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="rounded-xl border-2 border-purple-500 bg-background px-6 py-4 text-center">
                <div className="font-semibold">AI Apps</div>
                <div className="text-xs text-muted-foreground">
                  Claude, ChatGPT, Cursor
                </div>
              </div>
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="h-0.5 w-12 bg-border" />
                <span className="mt-1 text-xs uppercase tracking-wide">
                  MCP Protocol
                </span>
              </div>
              <div className="rounded-xl border-2 border-primary bg-primary/10 px-6 py-4 text-center">
                <div className="font-semibold">athreei Gateway</div>
                <div className="text-xs text-muted-foreground">
                  Local MCP Server
                </div>
              </div>
            </div>
            <div className="h-8 w-0.5 bg-border" />
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="rounded-xl border-2 border-green-500 bg-background px-6 py-4 text-center">
                <div className="font-semibold">MCP Servers</div>
                <div className="text-xs text-muted-foreground">
                  Files, Database, APIs
                </div>
              </div>
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="h-0.5 w-12 bg-border" />
                <span className="mt-1 text-xs uppercase tracking-wide">
                  Native Messaging
                </span>
              </div>
              <div className="rounded-xl border-2 border-yellow-500 bg-background px-6 py-4 text-center">
                <div className="font-semibold">Browser</div>
                <div className="text-xs text-muted-foreground">
                  Chrome Extension
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: 1,
                title: "Install Extension",
                description:
                  "Add the Chrome extension and native host to your system",
              },
              {
                step: 2,
                title: "Configure AI App",
                description:
                  "Point Claude Desktop or your preferred AI to the athreei MCP server",
              },
              {
                step: 3,
                title: "Start Using",
                description:
                  "Ask your AI to interact with websites, scrape data, or automate browser tasks",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MCP Explained Section */}
      <section className="px-6 py-20 lg:py-28" id="mcp">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
              What is MCP?
            </h2>
            <p className="text-lg text-muted-foreground">
              The open protocol connecting AI to external tools
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 text-muted-foreground">
              <p>
                The{" "}
                <strong className="text-foreground">
                  Model Context Protocol (MCP)
                </strong>{" "}
                is an open standard developed by Anthropic that allows AI
                assistants to securely connect to external data sources and
                tools.
              </p>
              <p>
                Instead of copy-pasting data into your AI chat, MCP lets the AI
                directly access the information it needs - files, databases,
                APIs, and now with athreei, your browser.
              </p>
              <h4 className="pt-4 font-semibold text-foreground">
                With athreei + MCP, your AI can:
              </h4>
              <ul className="list-inside list-disc space-y-2">
                <li>Read content from any webpage you have open</li>
                <li>Fill forms and interact with web applications</li>
                <li>Scrape structured data from websites</li>
                <li>Automate repetitive browser tasks</li>
                <li>Monitor pages for changes</li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-secondary/50 px-4 py-3 font-mono text-sm text-muted-foreground">
                claude_desktop_config.json
              </div>
              <pre className="overflow-x-auto p-4">
                <code className="font-mono text-sm">{`{
  "mcpServers": {
    "athreei": {
      "command": "athreei",
      "args": ["mcp", "serve"]
    }
  }
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-secondary/50 px-6 py-20 lg:py-28" id="security">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
              Security & Privacy
            </h2>
            <p className="text-lg text-muted-foreground">
              Built with security as a core principle, not an afterthought
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {securityFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-background p-6"
              >
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {feature.title}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 lg:py-28" id="faq">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Common questions about athreei
            </p>
          </div>

          <Accordion>
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-t from-secondary to-background px-6 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Ready to connect your AI to the browser?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join developers using athreei to supercharge their AI workflows.
            Free forever, no credit card required.
          </p>
          <Button size="lg" asChild>
            <Link href={`${DOCS_URL}/docs/user-guide`}>Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-between gap-8">
            <div>
              <h3 className="mb-2 text-xl font-semibold">athreei</h3>
              <p className="text-sm text-muted-foreground">
                Privacy-focused AI browser bridge via MCP
              </p>
            </div>

            <div className="flex flex-wrap gap-12">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Product</h4>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Link href="#features" className="hover:text-foreground">
                    Features
                  </Link>
                  <Link href="#faq" className="hover:text-foreground">
                    FAQ
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Resources</h4>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Link href={DOCS_URL} className="hover:text-foreground">
                    Documentation
                  </Link>
                  <Link
                    href={`${DOCS_URL}/docs/user-guide`}
                    className="hover:text-foreground"
                  >
                    Quick Start
                  </Link>
                  <Link
                    href="https://github.com/athreei/athreei"
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Legal</h4>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>Built with care by athreei</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
