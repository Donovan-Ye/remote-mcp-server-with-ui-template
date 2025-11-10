# Vercel Deployment Guide

This guide explains how to deploy your MCP server to Vercel with minimal configuration changes.

## Changes Made

Only **3 files** were added/modified to support Vercel:

1. **`vercel.json`** - Vercel configuration
2. **`api/index.js`** - Serverless function handler
3. **`packages/mcp-server/src/index.ts`** - Minor change to conditionally skip `listen()` on Vercel
4. **`package.json`** - Added `vercel-build` script

## Prerequisites

1. A Vercel account ([vercel.com](https://vercel.com))
2. A PostgreSQL database (Vercel Postgres, Supabase, Railway, etc.)
3. OAuth provider credentials (e.g., GitHub OAuth App)

## Deployment Steps

### 1. Set Up Database

Create a PostgreSQL database. Popular options:

- **Vercel Postgres**: Integrated with Vercel projects
- **Supabase**: Free tier with good PostgreSQL support
- **Railway**: Easy PostgreSQL hosting
- **Neon**: Serverless PostgreSQL

Get your database connection string (e.g., `postgresql://user:password@host:5432/database`)

### 2. Run Database Migrations

Before deploying, run migrations on your production database:

```bash
# Set your production database URL
export POSTGRES_URL="your_production_database_url"

# Run migrations
pnpm db:migrate:deploy
```

### 3. Deploy to Vercel

#### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

#### Option B: Via Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel will auto-detect the project settings

### 4. Configure Environment Variables

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add:

**Required:**
- `POSTGRES_URL` - Your PostgreSQL connection string

**OAuth (if enabled):**
- `UPSTREAM_OAUTH_CLIENT_ID`
- `UPSTREAM_OAUTH_CLIENT_SECRET`
- `UPSTREAM_OAUTH_BASE_URL` (e.g., `https://github.com`)
- `UPSTREAM_OAUTH_AUTHORIZE_ENDPOINT` (e.g., `/login/oauth/authorize`)
- `UPSTREAM_OAUTH_TOKEN_ENDPOINT` (e.g., `/login/oauth/access_token`)

**Optional:**
- `NODE_ENV` - Set to `production`

### 5. Update OAuth Callback URL

If using OAuth, update your OAuth provider's callback URL to:
```
https://your-app.vercel.app/callback
```

### 6. Test Your Deployment

Once deployed, test your endpoints:

- Health check: `https://your-app.vercel.app/health`
- MCP endpoint: `https://your-app.vercel.app/mcp`
- UI: `https://your-app.vercel.app/ui`

## How It Works

1. **vercel.json** configures Vercel to:
   - Build the project using `pnpm vercel-build`
   - Route all requests to `/api` (serverless function)
   - Serve static UI files from `/ui`

2. **api/index.js** is a serverless function that:
   - Sets `VERCEL=1` environment variable
   - Imports the Express app
   - Handles requests without calling `listen()`

3. **Modified index.ts**:
   - Detects Vercel environment (`process.env.VERCEL`)
   - Skips `app.listen()` when on Vercel
   - Returns the Express app for the serverless handler

## Local Development

Local development remains unchanged:

```bash
# Start development server
pnpm dev

# Start UI
pnpm dev:ui

# Or start both
pnpm dev:all
```

The code automatically detects it's not on Vercel and runs normally.

## Limitations

**Session Storage:** Sessions are stored in-memory (ephemeral). For production, consider:
- Using Redis for session storage
- Database-backed session store
- Sticky sessions via Vercel's routing

**Cold Starts:** Serverless functions have cold start latency (~1-2s). First request may be slower.

**Execution Time:** Vercel functions have a 10s timeout (60s on Pro). Long-running operations may need adjustment.

## Troubleshooting

### Build Fails

- Check that `POSTGRES_URL` is set in environment variables
- Ensure Prisma can generate the client during build

### Database Connection Issues

- Verify `POSTGRES_URL` is correct
- Check that your database allows connections from Vercel's IP ranges
- For Vercel Postgres, ensure it's linked to your project

### OAuth Not Working

- Verify callback URL matches your OAuth provider settings
- Check all `UPSTREAM_OAUTH_*` environment variables are set
- Ensure `https://` is used (not `http://`) in production

### App Not Loading

- Check Vercel function logs in the dashboard
- Verify build completed successfully
- Test the `/health` endpoint

## Support

For issues, check:
- Vercel deployment logs
- Function logs in Vercel dashboard
- Your database connection status

