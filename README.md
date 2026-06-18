# Proposal Generator — Setu

Use **Supabase** for a shared database across devices, or **localStorage** for offline single-browser use.

**User guide (workflow, expectations, limitations):** see [DOCUMENTATION.md](./DOCUMENTATION.md).

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
```

## Environment Variables (.env)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | AI research & executive summary |
| `FIRECRAWL_API_KEY` | Optional | Real web research about clients |
| `SUPABASE_URL` | For shared DB | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | For shared DB | Anon/public key (safe in browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-only admin key |
| `VITE_LOCAL_DEV` | Optional | Set `true` only when **not** using Supabase |

When `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set, the app uses Supabase automatically and syncs services/proposals across all devices on that project.

## One-time Supabase setup (required)

If you see **"Could not find the table 'public.services'"**, the database schema has not been created yet.

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env` and paste your keys (same file on every device)
3. Open **Supabase Dashboard → SQL Editor → New query**
4. Copy the entire contents of **`supabase/setup.sql`** from this repo, paste, and click **Run**

That creates `services` and `proposals` tables plus permissions for the anon key. Safe to re-run if needed.

## Generated Files

DOCX/PDF downloads are generated in the browser and saved locally when you click **Generate DOCX/PDF**.

## Data Storage Modes

| Mode | When | Where data lives |
|---|---|---|
| **Shared** | Supabase keys in `.env` | Supabase Postgres (all devices) |
| **Local** | No Supabase keys + `VITE_LOCAL_DEV=true` | Browser localStorage only |
