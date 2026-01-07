# Free-Tier Hosting Guide

Deploy athreei cloud components using free tiers.

## Architecture

```
Vercel (free)         Fly.io (free)        Neon (free)
├── Platform UI       ├── API Server       └── PostgreSQL
└── Marketing         └── Gateway Cloud
```

## Prerequisites

- GitHub account
- Vercel account (free)
- Fly.io account (free, card required for verification)
- Neon account (free)

## Step 1: Database (Neon)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Note: Free tier includes 0.5GB storage, 3GB bandwidth/month

## Step 2: API Server (Fly.io)

### Install Fly CLI

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Deploy

```bash
# Login to Fly
fly auth login

# Navigate to API
cd apps/api

# Create app (don't deploy yet)
fly launch --name athreei-api --no-deploy

# Set secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  CORS_ORIGINS="https://your-platform.vercel.app"

# Deploy
fly deploy
```

Your API will be available at `https://athreei-api.fly.dev`

## Step 3: Gateway Cloud (Fly.io)

```bash
cd packages/gateway-cloud

fly launch --name athreei-gateway --no-deploy

fly secrets set \
  PLATFORM_URL="https://athreei-api.fly.dev"

fly deploy
```

Gateway available at `https://athreei-gateway.fly.dev`

## Step 4: Platform UI (Vercel)

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import project
3. Configure:
   - Root Directory: `apps/platform`
   - Framework Preset: Next.js
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://athreei-api.fly.dev
   BETTER_AUTH_URL=https://athreei-api.fly.dev
   ```
5. Deploy

## Cost Breakdown

| Service | Free Tier Limit | Notes |
|---------|-----------------|-------|
| Neon | 0.5GB storage, 1 project | Auto-suspend after 5min idle |
| Fly.io | 3 shared VMs, 160GB bandwidth | Requires card verification |
| Vercel | 100GB bandwidth | Unlimited deploys |

**Total: $0/month** for MVP testing

## Alternative: Railway

If Fly.io card verification is an issue:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy API
cd apps/api
railway up

# Set variables in Railway dashboard
```

## Environment Variables Reference

### API Server
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | 32-byte base64 secret |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `PORT` | No | Default: 3001 |
| `RESEND_API_KEY` | No | For email features |

### Gateway Cloud
| Variable | Required | Description |
|----------|----------|-------------|
| `PLATFORM_URL` | Yes | API server URL |
| `PORT` | No | Default: 3001 |

### Platform UI
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | API server URL |
| `BETTER_AUTH_URL` | Yes | Same as API URL |

## Troubleshooting

### Database connection issues
- Ensure `?sslmode=require` is in Neon URL
- Check Fly.io secrets are set correctly

### CORS errors
- Add your Vercel domain to `CORS_ORIGINS`
- Include both with and without trailing slash

### Cold starts
- Free tier VMs sleep after inactivity
- First request may take 5-10 seconds
- Consider Railway for faster cold starts
