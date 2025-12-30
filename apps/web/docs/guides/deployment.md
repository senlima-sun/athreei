# Deployment Guide

This guide covers deploying athreei's cloud services to production.

## Architecture Overview

athreei uses a multi-platform deployment strategy:

| Service | Platform | Purpose |
|---------|----------|---------|
| Dashboard | Vercel | User dashboard SPA |
| Marketing Site | Vercel | Documentation and landing pages |
| Gateway Cloud | Fly.io | MCP aggregation gateway |
| Sync Server | Fly.io | E2E encrypted sync service |
| Database | Neon | PostgreSQL database |

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account** - [vercel.com](https://vercel.com)
2. **Fly.io Account** - [fly.io](https://fly.io)
3. **Neon Account** - [neon.tech](https://neon.tech)
4. **GitHub Repository** - With Actions enabled

## Environment Setup

### GitHub Secrets

Configure these secrets in your GitHub repository (Settings > Secrets > Actions):

#### Vercel Secrets
```
VERCEL_TOKEN           # Vercel API token
VERCEL_ORG_ID          # Vercel organization ID
VERCEL_DASHBOARD_PROJECT_ID  # Dashboard project ID
VERCEL_WEB_PROJECT_ID  # Marketing site project ID
```

#### Fly.io Secrets
```
FLY_API_TOKEN          # Fly.io API token
```

#### Application Secrets
```
VITE_API_URL           # API endpoint URL
VITE_SYNC_SERVER_URL   # Sync server URL
```

### Getting Vercel Credentials

1. **API Token**: Go to [Vercel Settings > Tokens](https://vercel.com/account/tokens)
2. **Organization ID**: Found in Vercel organization settings
3. **Project IDs**: Create projects in Vercel, then find IDs in project settings

### Getting Fly.io Credentials

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Get API token
fly tokens create deploy -x 999999h
```

## Vercel Setup

### Dashboard Deployment

1. Create a new Vercel project linked to your repository
2. Set the root directory to `packages/dashboard`
3. Configure environment variables:

```bash
VITE_API_URL=https://api.athreei.com
VITE_SYNC_SERVER_URL=https://athreei-sync.fly.dev
```

### Marketing Site Deployment

1. Create a new Vercel project linked to your repository
2. Set the root directory to `apps/web`

## Fly.io Setup

### Gateway Cloud

```bash
cd packages/gateway-cloud

# Create the app (first time only)
fly apps create athreei-gateway

# Set secrets
fly secrets set \
  NODE_ENV=production

# Deploy
fly deploy
```

### Sync Server

```bash
cd packages/sync-server

# Create the app (first time only)
fly apps create athreei-sync

# Set secrets (use your Neon connection string)
fly secrets set \
  DATABASE_URL="postgres://user:pass@host/db?sslmode=require" \
  NODE_ENV=production

# Deploy
fly deploy
```

## Database Setup (Neon)

1. Create a new Neon project at [neon.tech](https://neon.tech)
2. Create a database named `athreei`
3. Copy the connection string
4. Run migrations:

```bash
# Locally
DATABASE_URL="your-neon-url" bun run --filter @athreei/sync-server db:migrate

# Or via Fly.io
fly ssh console -a athreei-sync
cd /app && bun run db:migrate
```

## CI/CD Pipeline

### Continuous Integration

On every push and PR:

1. **Lint** - ESLint checks
2. **Format** - Prettier verification
3. **Type Check** - TypeScript validation
4. **Test** - Vitest test suite
5. **Build** - Production builds

### Continuous Deployment

On push to `main`:

- **Dashboard** → Vercel (production)
- **Marketing Site** → Vercel (production)
- **Gateway Cloud** → Fly.io
- **Sync Server** → Fly.io

On PR:

- **Dashboard** → Vercel (preview)
- **Marketing Site** → Vercel (preview)

## Manual Deployment

### Deploy to Vercel Manually

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy dashboard
cd packages/dashboard
vercel --prod

# Deploy web
cd apps/web
vercel --prod
```

### Deploy to Fly.io Manually

```bash
# Gateway
cd packages/gateway-cloud
fly deploy

# Sync Server
cd packages/sync-server
fly deploy
```

## Monitoring

### Fly.io Monitoring

```bash
# View logs
fly logs -a athreei-gateway
fly logs -a athreei-sync

# Check status
fly status -a athreei-gateway
fly status -a athreei-sync

# SSH into container
fly ssh console -a athreei-gateway
```

### Health Checks

All services expose health endpoints:

- Gateway: `https://athreei-gateway.fly.dev/health`
- Sync Server: `https://athreei-sync.fly.dev/health`

## Scaling

### Fly.io Scaling

```bash
# Scale horizontally
fly scale count 3 -a athreei-gateway

# Scale vertically
fly scale vm shared-cpu-2x -a athreei-gateway
fly scale memory 1024 -a athreei-gateway
```

### Database Scaling

Neon provides automatic scaling. For high-traffic scenarios:

1. Enable connection pooling in Neon dashboard
2. Upgrade to a larger compute size

## Rollbacks

### Vercel Rollback

1. Go to Vercel Dashboard
2. Select the deployment
3. Click "Instant Rollback"

### Fly.io Rollback

```bash
# List releases
fly releases -a athreei-gateway

# Rollback to specific version
fly deploy --image registry.fly.io/athreei-gateway:v5 -a athreei-gateway
```

## Troubleshooting

### Common Issues

**Build failures on Vercel:**
- Check that workspace dependencies are properly declared
- Verify environment variables are set

**Fly.io deployment stuck:**
```bash
# Check deployment status
fly status -a athreei-gateway

# Force restart
fly apps restart athreei-gateway
```

**Database connection errors:**
- Verify DATABASE_URL secret is set correctly
- Check Neon dashboard for connection limits
- Ensure SSL mode is enabled (`?sslmode=require`)

### Getting Help

- [Vercel Documentation](https://vercel.com/docs)
- [Fly.io Documentation](https://fly.io/docs)
- [Neon Documentation](https://neon.tech/docs)
