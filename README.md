# athreei

AI toolset platform for AI, Inc. and I.

## Security

athreei is designed with security as a priority:

- **Default deny** - No action without explicit user permission
- **Origin-scoped permissions** - Permissions are per-website
- **Tool-scoped permissions** - Granular control per action type
- **Full audit logging** - Every AI interaction is logged
- **E2E encryption** - Optional sync uses AES-256-GCM encryption
- **Local-first** - Data stays on your machine by default

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript 5.7 (strict mode)
- **Backend:** Hono web framework
- **Frontend:** React 18, Vite 6, Tailwind CSS v4, shadcn/ui
- **Database:** SQLite (local), PostgreSQL (sync server)
- **Protocol:** Model Context Protocol (MCP)
- **Testing:** Vitest

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.
