import Link from "next/link"
import { GithubIcon, TwitterIcon } from "lucide-react"

const footerLinks = {
  Products: [
    { label: "Platform", href: "/platform" },
    { label: "Desktop", href: "/desktop" },
    { label: "Pricing", href: "/pricing" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    { label: "MCP Registry", href: "/registry" },
    { label: "Changelog", href: "/changelog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "License", href: "/license" },
  ],
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        className="fill-primary"
      />
      <path
        d="M16 8L22 12V20L16 24L10 20V12L16 8Z"
        className="fill-primary-foreground"
        fillOpacity="0.9"
      />
      <circle cx="16" cy="16" r="3" className="fill-primary" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo />
              <span className="text-xl font-semibold tracking-tight">
                athreei
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Open source platform for aggregating AI tools and managing memory
              across all your AI apps.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="https://github.com/athreei"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="GitHub"
              >
                <GithubIcon className="size-5" />
              </a>
              <a
                href="https://twitter.com/athreei"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Twitter"
              >
                <TwitterIcon className="size-5" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold">{category}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} athreei. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Open source under{" "}
            <a
              href="https://github.com/athreei/athreei/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              GPL-3.0
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
