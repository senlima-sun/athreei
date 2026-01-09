# athreei Documentation

Documentation site for athreei built with [Fumadocs](https://fumadocs.dev) and Next.js 16.

## Tech Stack

- **Framework**: Next.js 16 with Turbopack
- **Docs Engine**: Fumadocs (core, ui, mdx)
- **Styling**: Tailwind CSS v4
- **Content**: MDX with frontmatter validation

## Development

```bash
# Run development server
bun run dev

# Build for production
bun run build

# Type check
bun run types:check
```

Open http://localhost:3000 to view the docs.

## Content Structure

Documentation lives in `content/docs/`:

```
content/docs/
├── index.mdx                    # Docs homepage
├── meta.json                    # Root navigation
├── getting-started/             # Installation, configuration
├── concepts/                    # Local vs cloud, architecture
├── gateway/                     # Local and cloud gateway docs
├── browser-tools/               # Browser extension tools
├── sdk/                         # SDK API reference
├── events/                      # Custom event system
├── audit-logs/                  # Traces and dashboard
├── development/                 # Contributing, setup
├── registry/                    # Tool registry
└── tools/                       # Available tools
```

## Adding New Documentation

### 1. Create an MDX file

```bash
# Example: Add a new guide
touch content/docs/guides/my-guide.mdx
```

### 2. Add frontmatter

```mdx
---
title: My Guide
description: A helpful guide about something
---

# My Guide

Content goes here...
```

### 3. Update navigation

Edit the `meta.json` in the parent directory to include your new page:

```json
{
  "title": "Guides",
  "pages": ["my-guide", "..."]
}
```

## Configuration

- `source.config.ts` - Fumadocs MDX configuration, frontmatter schema
- `lib/source.ts` - Content source adapter
- `lib/layout.shared.tsx` - Shared layout options

## Project Structure

| Route                     | Description                   |
| ------------------------- | ----------------------------- |
| `app/(home)`              | Landing page and other pages  |
| `app/docs`                | Documentation layout & pages  |
| `app/api/search/route.ts` | Search API route handler      |

## Resources

- [Fumadocs Documentation](https://fumadocs.dev)
- [Fumadocs MDX Guide](https://fumadocs.dev/docs/mdx)
- [Next.js Documentation](https://nextjs.org/docs)
