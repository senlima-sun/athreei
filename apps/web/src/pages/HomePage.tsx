import { SITE_URL } from '../index'

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div class="feature-card">
      <div class="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

// FAQ Item Component
function FAQItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <details class="faq-item">
      <summary>{question}</summary>
      <p>{answer}</p>
    </details>
  )
}

// Architecture Diagram Component
function ArchitectureDiagram() {
  return (
    <div class="architecture-diagram">
      <div class="diagram-row">
        <div class="diagram-box diagram-ai">
          <div class="diagram-label">AI Apps</div>
          <div class="diagram-examples">Claude, ChatGPT, Cursor</div>
        </div>
        <div class="diagram-arrow">
          <span class="arrow-line"></span>
          <span class="arrow-label">MCP Protocol</span>
        </div>
        <div class="diagram-box diagram-gateway">
          <div class="diagram-label">athreei Gateway</div>
          <div class="diagram-examples">Local MCP Server</div>
        </div>
      </div>
      <div class="diagram-vertical-connector">
        <span class="connector-line"></span>
      </div>
      <div class="diagram-row">
        <div class="diagram-box diagram-mcp">
          <div class="diagram-label">MCP Servers</div>
          <div class="diagram-examples">Files, Database, APIs</div>
        </div>
        <div class="diagram-arrow">
          <span class="arrow-line"></span>
          <span class="arrow-label">Native Messaging</span>
        </div>
        <div class="diagram-box diagram-browser">
          <div class="diagram-label">Browser</div>
          <div class="diagram-examples">Chrome Extension</div>
        </div>
      </div>
    </div>
  )
}

// Pricing Card Component
function PricingCard({
  name,
  price,
  description,
  features,
  highlighted,
  cta,
}: {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
  cta: string
}) {
  return (
    <div class={`pricing-card ${highlighted ? 'pricing-highlighted' : ''}`}>
      {highlighted && <div class="pricing-badge">Most Popular</div>}
      <h3>{name}</h3>
      <div class="pricing-price">{price}</div>
      <p class="pricing-description">{description}</p>
      <ul class="pricing-features">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <a
        href="/docs/getting-started/quick-start"
        class={`btn ${highlighted ? 'btn-primary' : 'btn-secondary'}`}
      >
        {cta}
      </a>
    </div>
  )
}

export function HomePage() {
  return (
    <main class="home-page">
      {/* Hero Section */}
      <header class="hero">
        <div class="hero-content">
          <span class="hero-badge">Privacy-First AI Integration</span>
          <h1>Connect AI to Your Browser</h1>
          <p class="tagline">
            Give Claude, ChatGPT, and other AI assistants secure access to your browser
            through the Model Context Protocol. Your data stays local, always.
          </p>
          <div class="hero-actions">
            <a href="/docs/getting-started/quick-start" class="btn btn-primary btn-large">
              Get Started Free
            </a>
            <a href="/docs" class="btn btn-secondary btn-large">
              View Documentation
            </a>
          </div>
          <div class="hero-trust">
            <span>Works with:</span>
            <div class="hero-logos">
              <span class="logo-item">Claude Desktop</span>
              <span class="logo-item">ChatGPT</span>
              <span class="logo-item">Cursor</span>
              <span class="logo-item">Any MCP Client</span>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section class="features-section" id="features">
        <div class="section-header">
          <h2>Why athreei?</h2>
          <p>Built for developers who care about privacy and flexibility</p>
        </div>
        <div class="features-grid">
          <FeatureCard
            icon="🔒"
            title="Privacy First"
            description="All data stays on your machine. No cloud processing. End-to-end encryption for optional sync between devices."
          />
          <FeatureCard
            icon="🔀"
            title="MCP Aggregation"
            description="Connect multiple MCP servers through a single gateway. Browser tools, file access, databases - all in one place."
          />
          <FeatureCard
            icon="🌐"
            title="Cross-Platform"
            description="Works on macOS, Windows, and Linux. Native binaries for each platform with automatic updates."
          />
          <FeatureCard
            icon="⚡"
            title="Zero Config"
            description="Install the extension, configure your AI app, and start using browser tools immediately. No complex setup required."
          />
          <FeatureCard
            icon="🔧"
            title="Fully Extensible"
            description="Add any MCP-compatible server. Build custom tools. Integrate with your existing workflow."
          />
          <FeatureCard
            icon="🛡️"
            title="Open Source"
            description="Audit the code yourself. Contribute improvements. No vendor lock-in, ever."
          />
        </div>
      </section>

      {/* How it Works Section */}
      <section class="how-it-works-section" id="how-it-works">
        <div class="section-header">
          <h2>How It Works</h2>
          <p>Simple architecture, powerful capabilities</p>
        </div>
        <ArchitectureDiagram />
        <div class="how-steps">
          <div class="how-step">
            <span class="step-number">1</span>
            <h4>Install Extension</h4>
            <p>Add the Chrome extension and native host to your system</p>
          </div>
          <div class="how-step">
            <span class="step-number">2</span>
            <h4>Configure AI App</h4>
            <p>Point Claude Desktop or your preferred AI to the athreei MCP server</p>
          </div>
          <div class="how-step">
            <span class="step-number">3</span>
            <h4>Start Using</h4>
            <p>Ask your AI to interact with websites, scrape data, or automate browser tasks</p>
          </div>
        </div>
      </section>

      {/* MCP Explained Section */}
      <section class="mcp-explained-section" id="mcp-explained">
        <div class="section-header">
          <h2>What is MCP?</h2>
          <p>The open protocol connecting AI to external tools</p>
        </div>
        <div class="mcp-content">
          <div class="mcp-text">
            <p>
              The <strong>Model Context Protocol (MCP)</strong> is an open standard developed by
              Anthropic that allows AI assistants to securely connect to external data sources
              and tools.
            </p>
            <p>
              Instead of copy-pasting data into your AI chat, MCP lets the AI directly access
              the information it needs - files, databases, APIs, and now with athreei, your browser.
            </p>
            <h4>With athreei + MCP, your AI can:</h4>
            <ul>
              <li>Read content from any webpage you have open</li>
              <li>Fill forms and interact with web applications</li>
              <li>Scrape structured data from websites</li>
              <li>Automate repetitive browser tasks</li>
              <li>Monitor pages for changes</li>
            </ul>
          </div>
          <div class="mcp-code">
            <div class="code-header">
              <span>claude_desktop_config.json</span>
            </div>
            <pre><code>{`{
  "mcpServers": {
    "athreei": {
      "command": "athreei",
      "args": ["mcp", "serve"]
    }
  }
}`}</code></pre>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section class="security-section" id="security">
        <div class="section-header">
          <h2>Security & Privacy</h2>
          <p>Built with security as a core principle, not an afterthought</p>
        </div>
        <div class="security-grid">
          <div class="security-item">
            <h4>Local Processing</h4>
            <p>
              All MCP communication happens locally on your machine. Your browser data never
              touches our servers.
            </p>
          </div>
          <div class="security-item">
            <h4>E2E Encryption</h4>
            <p>
              Optional cross-device sync uses XChaCha20-Poly1305 encryption. Only you hold the keys.
            </p>
          </div>
          <div class="security-item">
            <h4>Permission Controls</h4>
            <p>
              Fine-grained permissions let you control exactly what your AI can access.
              Whitelist specific domains.
            </p>
          </div>
          <div class="security-item">
            <h4>Open Source</h4>
            <p>
              Every line of code is auditable. Security researchers welcome.
              Bug bounty program available.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section class="pricing-section" id="pricing">
        <div class="section-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Start free, upgrade when you need more</p>
        </div>
        <div class="pricing-grid">
          <PricingCard
            name="Free"
            price="$0"
            description="Perfect for individual developers"
            features={[
              'Unlimited local MCP connections',
              'Browser tools (read, click, type)',
              'Basic automation capabilities',
              'Community support',
              'Open source codebase',
            ]}
            cta="Get Started Free"
          />
          <PricingCard
            name="Pro"
            price="$9/mo"
            description="For power users and small teams"
            features={[
              'Everything in Free',
              'E2E encrypted cloud sync',
              'Multi-device support',
              'Priority support',
              'Advanced automation tools',
            ]}
            highlighted
            cta="Start Free Trial"
          />
          <PricingCard
            name="Team"
            price="$29/mo"
            description="For organizations"
            features={[
              'Everything in Pro',
              'Team management',
              'Shared configurations',
              'SSO integration',
              'Dedicated support',
            ]}
            cta="Contact Sales"
          />
        </div>
      </section>

      {/* FAQ Section */}
      <section class="faq-section" id="faq">
        <div class="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Common questions about athreei</p>
        </div>
        <div class="faq-list">
          <FAQItem
            question="Is athreei really free?"
            answer="Yes! The core functionality is completely free and always will be. The local MCP server, browser extension, and basic automation tools are free and open source. Paid plans add cloud sync and team features."
          />
          <FAQItem
            question="Does my data go to Anthropic or OpenAI?"
            answer="athreei itself never sends your data anywhere. When you use Claude or ChatGPT with athreei, the AI only sees the specific content you authorize through MCP. Your browsing history and other data stays completely local."
          />
          <FAQItem
            question="Which browsers are supported?"
            answer="Currently, athreei supports Chrome and Chromium-based browsers (Edge, Brave, Arc). Firefox support is planned for a future release."
          />
          <FAQItem
            question="Can I use athreei with my own MCP servers?"
            answer="Absolutely! athreei acts as an MCP aggregation gateway. You can add any MCP-compatible server alongside the browser tools. This lets you give your AI access to files, databases, APIs, and your browser all through one connection."
          />
          <FAQItem
            question="Is it safe to let AI control my browser?"
            answer="athreei includes multiple safety features: permission controls, domain whitelisting, action confirmations, and the ability to set read-only mode. You stay in control of what your AI can access and do."
          />
          <FAQItem
            question="What AI assistants work with athreei?"
            answer="Any AI assistant that supports MCP works with athreei. This includes Claude Desktop, ChatGPT (with MCP plugins), Cursor, and many other developer tools. Check our documentation for specific setup guides."
          />
          <FAQItem
            question="How is this different from browser automation tools like Selenium?"
            answer="Traditional automation tools require you to write explicit scripts. With athreei, you describe what you want in natural language, and your AI figures out how to accomplish it. It's automation powered by intelligence, not scripts."
          />
        </div>
      </section>

      {/* Final CTA Section */}
      <section class="cta-section">
        <div class="cta-content">
          <h2>Ready to connect your AI to the browser?</h2>
          <p>
            Join thousands of developers using athreei to supercharge their AI workflows.
            Free forever, no credit card required.
          </p>
          <a href="/docs/getting-started/quick-start" class="btn btn-primary btn-large">
            Get Started Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer class="home-footer">
        <div class="footer-content">
          <div class="footer-brand">
            <h3>athreei</h3>
            <p>Privacy-focused AI browser bridge via MCP</p>
          </div>
          <div class="footer-links">
            <div class="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
            </div>
            <div class="footer-column">
              <h4>Resources</h4>
              <a href="/docs">Documentation</a>
              <a href="/docs/getting-started/quick-start">Quick Start</a>
              <a href="https://github.com/athreei/athreei">GitHub</a>
            </div>
            <div class="footer-column">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>Built with care at {SITE_URL}</p>
        </div>
      </footer>
    </main>
  )
}
