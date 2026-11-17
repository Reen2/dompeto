# Cloudflare Dompet Setup

This project deploys to Cloudflare Pages with serverless functions and Neon PostgreSQL.

## Development

```bash
npm run dev
```

## Build & Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=dompet --force
```

## Environment Variables

Set secrets for the Pages project "dompet" (production):

```bash
wrangler pages secret put DATABASE_URL --project-name=dompet
wrangler pages secret put JWT_SECRET --project-name=dompet
```

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/sync`
- `PUT /api/sync`

## Database Schema

Neon has users and snapshots tables:

- users (id, email, password_hash, name, created_at)
- snapshots (user_id, data (JSONB), updated_at)

## Features

- Login/signup via Neon Auth
- Full snapshot sync from Dexie to Neon
- Profile avatar upload
- Offline-first architecture
- Cloudflare Pages Functions

## Troubleshooting

If API calls return 500 errors, check that:
1. DATABASE_URL and JWT_SECRET secrets are set correctly in Cloudflare Pages dashboard
2. Your local secrets match the remote secrets
3. The functions are deployed correctly

## Quick Start

1. Set secrets
2. Build
3. Deploy
4. Test login and registration