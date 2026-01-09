# athreei Sync Server

Privacy-focused E2E encrypted sync server for athreei platform.

## Features

- **E2E Encryption**: All data is encrypted before syncing
- **Multi-device Support**: Sync across multiple devices per account
- **Conflict Resolution**: Version-based conflict detection with last-write-wins
- **Selective Sync**: Choose what data types to sync
- **Secure Authentication**: Argon2 password hashing with JWT tokens
- **Cursor-based Sync**: Efficient incremental sync with pagination

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Configure your database URL in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/athreei_sync
```

3. Install dependencies:

```bash
bun install
```

4. Run migrations:

```bash
bun run migrate
```

5. Start the server:

```bash
bun run dev
```

## API Endpoints

### Authentication

- `POST /auth/register` - Create a new account
- `POST /auth/login` - Login and get JWT token
- `POST /auth/logout` - Logout (client-side token deletion)
- `DELETE /auth/account` - Delete account and all data

### Devices

- `GET /devices` - List all devices for the account
- `POST /devices` - Register a new device
- `DELETE /devices/:deviceId` - Remove a device

### Sync

- `GET /sync?deviceId=xxx&cursor=xxx&limit=100` - Pull changes
- `POST /sync` - Push changes to server
- `GET /sync/state?deviceId=xxx` - Get sync state for device
- `GET /sync/settings` - Get sync preferences
- `PUT /sync/settings` - Update sync preferences

### Traces

- `POST /traces` - Upload traces (batch)
- `GET /traces` - List traces (paginated with filters)
- `GET /traces/analytics` - Get trace analytics summary
- `GET /traces/:uuid` - Get single trace
- `DELETE /traces` - Delete traces (bulk)

## Database Schema

The server uses PostgreSQL with the following tables:

- `accounts` - User accounts with hashed passwords
- `devices` - Registered devices per account
- `sync_items` - E2E encrypted data items
- `sync_state` - Sync cursor state per device
- `sync_settings` - Sync preferences per account
- `traces` - E2E encrypted trace data for observability

## Conflict Resolution

The sync server uses version-based conflict detection:

1. Each sync item has a version number
2. On update, version is incremented
3. If client version doesn't match server version, a conflict is detected
4. Conflicts are returned to the client for manual resolution
5. Last-write-wins is used as fallback

## Soft Deletes

Deleted items are soft-deleted (tombstones) to ensure proper sync across devices. Items are marked with `deleted_at` timestamp and can be garbage collected after a retention period.

## Security

- Passwords are hashed with Argon2id
- JWT tokens for authentication (7-day expiration)
- All sync data is E2E encrypted (encryption handled by clients)
- Device-specific public keys for device-to-device encryption

## Development

```bash
# Run in dev mode with auto-reload
bun run dev

# Build for production
bun run build

# Run compiled version
bun run start

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Type check
bun run typecheck
```

## Database Commands

```bash
# Run migrations (custom script)
bun run migrate

# Drizzle Kit commands
bun run db:generate   # Generate migrations from schema
bun run db:migrate    # Run Drizzle migrations
bun run db:push       # Push schema changes directly
bun run db:studio     # Open Drizzle Studio
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT signing (required)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

## License

GPL-3.0
