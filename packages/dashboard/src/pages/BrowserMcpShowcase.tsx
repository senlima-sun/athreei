/**
 * Browser MCP Showcase Page
 *
 * Tutorial page demonstrating the athreei Browser MCP server.
 * Includes setup guide, example prompts, and feature overview.
 */

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs"

/**
 * Browser tool definition for display
 */
interface BrowserTool {
  name: string
  description: string
  example: string
}

/**
 * Example prompt for users to try
 */
interface ExamplePrompt {
  title: string
  prompt: string
  description: string
}

/**
 * Available browser tools
 */
const browserTools: BrowserTool[] = [
  {
    name: "browser_list_tabs",
    description: "List all open browser tabs with their IDs, URLs, and titles",
    example: "List all my open browser tabs",
  },
  {
    name: "browser_get_active_tab",
    description: "Get information about the currently active tab",
    example: "What page am I currently viewing?",
  },
  {
    name: "browser_navigate",
    description: "Navigate to a URL in a specific tab or create a new tab",
    example: "Open github.com in a new tab",
  },
  {
    name: "browser_get_content",
    description:
      "Extract page content in various formats (accessibility tree, HTML, or text)",
    example: "Get the main content of this page",
  },
  {
    name: "browser_get_elements",
    description: "Find interactive elements on the page by selector or role",
    example: "Find all buttons on this page",
  },
  {
    name: "browser_click",
    description: "Click on elements by selector or index",
    example: "Click the submit button",
  },
  {
    name: "browser_type",
    description: "Type text into input fields with optional clear and submit",
    example: "Type 'hello world' in the search box",
  },
  {
    name: "browser_scroll",
    description: "Scroll the page or specific elements",
    example: "Scroll down to see more content",
  },
  {
    name: "browser_screenshot",
    description: "Capture screenshots of the page or specific elements",
    example: "Take a screenshot of this page",
  },
  {
    name: "browser_execute_script",
    description: "Execute custom JavaScript in the page context",
    example: "Get the page title using JavaScript",
  },
  {
    name: "browser_wait",
    description:
      "Wait for elements to appear, disappear, or conditions to be met",
    example: "Wait for the loading spinner to disappear",
  },
]

/**
 * Example prompts for users to try
 */
const examplePrompts: ExamplePrompt[] = [
  {
    title: "Web Research",
    prompt:
      "Navigate to wikipedia.org, search for 'artificial intelligence', and summarize the first paragraph",
    description:
      "Demonstrates navigation, form filling, and content extraction",
  },
  {
    title: "Form Automation",
    prompt:
      "Find all input fields on the current page and describe what each one is for",
    description: "Shows element discovery and accessibility analysis",
  },
  {
    title: "Visual Documentation",
    prompt:
      "Take a full-page screenshot of the current website and describe its layout",
    description: "Demonstrates screenshot capture and visual analysis",
  },
  {
    title: "Tab Management",
    prompt:
      "List all my open tabs and tell me which ones are related to shopping",
    description: "Shows tab listing and content analysis across tabs",
  },
  {
    title: "Interactive Testing",
    prompt:
      "Find all buttons on this page, click each one, and report what happens",
    description: "Demonstrates element interaction and state observation",
  },
  {
    title: "Data Extraction",
    prompt: "Extract all links from this page and organize them by category",
    description: "Shows content extraction and data organization",
  },
]

/**
 * Setup steps for the Browser MCP
 */
const setupSteps = [
  {
    step: 1,
    title: "Install the Chrome Extension",
    description:
      "Download and install the athreei Chrome extension from the Chrome Web Store or load it as an unpacked extension in developer mode.",
    code: null,
  },
  {
    step: 2,
    title: "Install the Native Host",
    description:
      "The native host bridges communication between the MCP server and the Chrome extension. Install it using the installer script.",
    code: "curl -fsSL https://get.athreei.com/native-host | bash",
  },
  {
    step: 3,
    title: "Configure Claude Desktop",
    description:
      "Add the Browser MCP to your Claude Desktop configuration file.",
    code: `{
  "mcpServers": {
    "athreei-browser": {
      "command": "npx",
      "args": ["-y", "@athreei/mcp-server"]
    }
  }
}`,
  },
  {
    step: 4,
    title: "Restart Claude Desktop",
    description:
      "Close and reopen Claude Desktop to load the new MCP server configuration.",
    code: null,
  },
  {
    step: 5,
    title: "Verify Connection",
    description:
      'Open a conversation in Claude Desktop and ask "List my browser tabs" to verify the Browser MCP is working.',
    code: null,
  },
]

export function BrowserMcpShowcase() {
  const navigate = useNavigate()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Browser MCP Showcase</h2>
          <p className="text-muted-foreground max-w-2xl">
            Control your browser with AI using the athreei Browser MCP server.
            Navigate pages, interact with elements, take screenshots, and
            automate workflows - all through natural language.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          icon="shield"
          title="Privacy-First"
          description="Full audit logging, permission controls, and local-only data processing"
        />
        <FeatureCard
          icon="tools"
          title="11 Browser Tools"
          description="Navigate, click, type, screenshot, and more - complete browser control"
        />
        <FeatureCard
          icon="zap"
          title="Works with Any AI"
          description="Compatible with Claude Desktop, ChatGPT, and any MCP-enabled AI app"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="tools">Available Tools</TabsTrigger>
          <TabsTrigger value="examples">Example Prompts</TabsTrigger>
        </TabsList>

        {/* Setup Guide Tab */}
        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Follow these steps to set up the Browser MCP with Claude Desktop
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {setupSteps.map((step) => (
                <div
                  key={step.step}
                  className="flex gap-4 pb-6 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                    {step.code && (
                      <div className="relative">
                        <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                          <code>{step.code}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() =>
                            copyToClipboard(step.code!, `step-${step.step}`)
                          }
                        >
                          {copiedCode === `step-${step.step}`
                            ? "Copied!"
                            : "Copy"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>Available Browser Tools</CardTitle>
              <CardDescription>
                The Browser MCP provides 11 tools for comprehensive browser
                control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {browserTools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <code className="text-sm font-semibold text-primary">
                      {tool.name}
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tool.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2 italic">
                      Try: "{tool.example}"
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle>Example Prompts</CardTitle>
              <CardDescription>
                Try these prompts to explore Browser MCP capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {examplePrompts.map((example, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{example.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {example.description}
                        </p>
                        <div className="bg-muted rounded-md p-3">
                          <p className="text-sm font-mono">
                            "{example.prompt}"
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(example.prompt, `example-${index}`)
                        }
                      >
                        {copiedCode === `example-${index}` ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Understanding the Browser MCP architecture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
              <ArchitectureBox label="AI App" sublabel="Claude, ChatGPT" />
              <Arrow />
              <ArchitectureBox
                label="MCP Server"
                sublabel="@athreei/mcp-server"
              />
              <Arrow />
              <ArchitectureBox
                label="Native Host"
                sublabel="Native Messaging"
              />
              <Arrow />
              <ArchitectureBox label="Extension" sublabel="Chrome Extension" />
              <Arrow />
              <ArchitectureBox label="Browser" sublabel="Chrome" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            All communication is local and encrypted. No data leaves your
            machine.
          </p>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Ready to Get Started?</h3>
              <p className="text-muted-foreground">
                Install the Browser MCP and start controlling your browser with
                AI
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  window.open("https://github.com/athreei/athreei", "_blank")
                }
              >
                View on GitHub
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  copyToClipboard("npx -y @athreei/mcp-server", "quick-install")
                }
              >
                {copiedCode === "quick-install"
                  ? "Copied!"
                  : "Copy Install Command"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Feature highlight card component
 */
interface FeatureCardProps {
  icon: "shield" | "tools" | "zap"
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  const iconMap = {
    shield: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
    tools: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    zap: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  }

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        {iconMap[icon]}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

/**
 * Architecture diagram box component
 */
function ArchitectureBox({
  label,
  sublabel,
}: {
  label: string
  sublabel: string
}) {
  return (
    <div className="px-4 py-3 bg-background rounded-lg border border-border text-center min-w-[120px]">
      <div className="font-semibold text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </div>
  )
}

/**
 * Arrow component for architecture diagram
 */
function Arrow() {
  return (
    <div className="text-muted-foreground hidden md:block">
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </div>
  )
}
