# @athreei/dashboard

Web dashboard for managing athreei browser automation - a React-based interface for monitoring sessions, permissions, audit logs, and system settings.

## Development

```bash
# Start Vite dev server on :5173
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run standalone API server on :3001
bun run server

# Type checking
bun run typecheck

# Testing
bun test
bun test:watch
```

## Structure

```
src/
├── api/           # Hono API server and routes
├── components/    # React components
│   ├── ui/       # shadcn/ui components
│   └── ...       # Layout, ConnectionStatus, ThemeProvider, etc.
├── pages/        # Route pages
│   ├── Dashboard.tsx
│   ├── AuditLogs.tsx
│   ├── Permissions.tsx
│   ├── Sessions.tsx
│   └── Settings.tsx
├── lib/          # Utilities
├── styles/       # Global styles
├── types/        # TypeScript types
└── App.tsx       # Main app with routing
```

## Tech Stack

- React 19 + TypeScript
- Vite 6 build tool
- Tailwind CSS v4
- shadcn/ui + Radix UI components
- React Router v6
- Hono API server
- TanStack Table
