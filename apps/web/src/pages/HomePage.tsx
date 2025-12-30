import { SITE_URL } from '../index'

export function HomePage() {
  return (
    <main class="home-page">
      <header class="hero">
        <h1>athreei</h1>
        <p class="tagline">Privacy-focused AI browser bridge via MCP</p>
        <div class="hero-actions">
          <a href="/docs/getting-started/quick-start" class="btn btn-primary">
            Get Started
          </a>
          <a href="/docs" class="btn btn-secondary">
            Documentation
          </a>
        </div>
      </header>

      <section class="features">
        <div class="feature">
          <h3>Privacy First</h3>
          <p>All data stays local. End-to-end encryption for optional sync.</p>
        </div>
        <div class="feature">
          <h3>Open Protocol</h3>
          <p>Built on the Model Context Protocol. Works with Claude, GPT, and more.</p>
        </div>
        <div class="feature">
          <h3>Extensible</h3>
          <p>Add any MCP server. Browser tools included out of the box.</p>
        </div>
      </section>

      <section class="cta">
        <h2>Ready to connect your AI to the browser?</h2>
        <a href="/docs/getting-started/quick-start" class="btn btn-primary">
          Start in 5 minutes
        </a>
      </section>

      <footer class="home-footer">
        <p>Coming soon at {SITE_URL}</p>
      </footer>
    </main>
  )
}
