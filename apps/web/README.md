# athreei Marketing Website

Marketing and landing page for athreei - the universal MCP gateway connecting AI apps to your browser.

## Tech Stack

- **Framework:** Next.js 15 with Turbopack
- **Language:** TypeScript 5.7
- **React:** React 19
- **Styling:** Tailwind CSS v4 with CSS custom properties
- **UI Components:** shadcn/ui (Button, Card, Badge, Accordion)
- **Icons:** Lucide React

## Getting Started

```bash
# Install dependencies (from monorepo root)
bun install

# Start development server
cd apps/web
bun run dev
```

The dev server runs on http://localhost:3003

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with Turbopack on port 3003 |
| `bun run build` | Build for production |
| `bun run start` | Run production build on port 3003 |
| `bun run lint` | Run Next.js ESLint |
| `bun run typecheck` | TypeScript type checking |

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── globals.css      # Tailwind + CSS custom properties
│   │   ├── layout.tsx       # Root layout with metadata
│   │   └── page.tsx         # Homepage (single-page marketing site)
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   │       ├── accordion.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       └── card.tsx
│   └── lib/
│       └── utils.ts         # cn() utility for className merging
├── next.config.ts           # Next.js configuration
├── postcss.config.mjs       # PostCSS with Tailwind
└── tsconfig.json            # TypeScript configuration
```

## Page Sections

The homepage (`src/app/page.tsx`) includes these sections:

| Section | ID | Description |
|---------|-----|-------------|
| Hero | - | Main headline, tagline, CTA buttons |
| Features | `#features` | 6 feature cards (Privacy, MCP Aggregation, Cross-Platform, etc.) |
| How It Works | `#how-it-works` | Architecture diagram + 3-step setup |
| What is MCP? | `#mcp` | MCP protocol explanation + config example |
| Security | `#security` | 4 security feature highlights |
| FAQ | `#faq` | Accordion with 6 common questions |
| CTA | - | Final call-to-action |
| Footer | - | Links to Features, FAQ, Docs, GitHub, Legal |

## Content Editing

### Updating Features

Edit the `features` array in `src/app/page.tsx`:

```typescript
const features = [
  {
    icon: Lock,           // Lucide icon component
    title: "Privacy First",
    description: "All data stays on your machine...",
  },
  // ...
]
```

### Updating FAQ

Edit the `faqs` array in `src/app/page.tsx`:

```typescript
const faqs = [
  {
    question: "Is athreei really free?",
    answer: "Yes! The core functionality...",
  },
  // ...
]
```

### Updating Security Features

Edit the `securityFeatures` array in `src/app/page.tsx`:

```typescript
const securityFeatures = [
  {
    title: "Local Processing",
    description: "All MCP communication happens locally...",
  },
  // ...
]
```

### External Links

The documentation URL is defined at the top of the page:

```typescript
const DOCS_URL = "https://docs.athreei.com"
```

### SEO Metadata

Update metadata in `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: { default: "athreei - Connect AI to Your Browser", ... },
  description: "...",
  keywords: ["AI", "browser automation", ...],
  openGraph: { ... },
  twitter: { ... },
}
```

## Styling

### Theme

The site uses a dark theme defined via CSS custom properties in `globals.css`:

- Primary color: Blue (`217 91% 60%`)
- Background: Near-black (`0 0% 4%`)
- Foreground: Light gray (`0 0% 90%`)

### Adding New UI Components

1. Add component to `src/components/ui/`
2. Follow shadcn/ui patterns with `class-variance-authority`
3. Use `cn()` utility from `@/lib/utils` for className merging

## Deployment

The site is a static Next.js app. Build and deploy with:

```bash
bun run build
# Output in .next/ - deploy to Vercel, Cloudflare Pages, etc.
```

For static export, add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
}
```
