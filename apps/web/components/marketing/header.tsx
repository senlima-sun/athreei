"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import { MenuIcon, XIcon, MonitorIcon, CloudIcon } from "lucide-react"

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
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

const productLinks = [
  {
    title: "Platform",
    description: "Dashboard for teams to manage MCP servers and observability",
    href: "/platform",
    icon: CloudIcon,
  },
  {
    title: "Desktop",
    description: "Personal memory engine with encrypted local storage",
    href: "/desktop",
    icon: MonitorIcon,
  },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="text-xl font-semibold tracking-tight">athreei</span>
        </Link>

        <NavigationMenu className="absolute left-1/2 hidden -translate-x-1/2 lg:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[380px] gap-1 p-2">
                    {productLinks.map((link) => (
                      <li key={link.title}>
                        <NavigationMenuLink
                          href={link.href}
                          className="flex select-none gap-3 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted focus:bg-muted"
                        >
                          <link.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                          <div>
                            <div className="text-sm font-medium">
                              {link.title}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {link.description}
                            </p>
                          </div>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  href="/docs"
                  className="flex h-9 items-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Docs
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  href="/pricing"
                  className="flex h-9 items-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Pricing
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <Link
              href="/login"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XIcon className="size-5" />
            ) : (
              <MenuIcon className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <nav className="flex flex-col gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Products
                </p>
                {productLinks.map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon className="size-4 text-primary" />
                    {link.title}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
                <Link
                  href="/docs"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Docs
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-muted"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
