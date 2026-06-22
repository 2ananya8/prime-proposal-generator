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
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions only | Never in GitHub Pages build; set in Supabase Edge Function secrets |
| `VITE_LOCAL_DEV` | Optional | Set `true` only when **not** using Supabase |

When `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set, the app uses Supabase automatically and syncs services/proposals across all devices on that project.

## One-time Supabase setup (required)

If you see **"Could not find the table 'public.services'"**, the database schema has not been created yet.

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` → `.env` and paste your keys (same file on every device)
3. Open **Supabase Dashboard → SQL Editor → New query**
4. Copy the entire contents of **`supabase/setup.sql`** from this repo, paste, and click **Run**

That creates `services`, `proposals`, and `profiles` tables plus row-level security. Safe to re-run if needed.

## Authentication (shared Supabase mode)

When Supabase is configured, **login is required**. Anonymous access to data is disabled.

### One-time admin setup

1. **Supabase Dashboard → Authentication → Users → Add user** — create the admin account (email + strong password, mark email confirmed).
2. **SQL Editor** — promote that user (replace the email):

```sql
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'you@company.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

3. **Authentication → Providers** — enable Email/password and **disable public signups**.
4. **Authentication → URL Configuration** — set **Site URL** to your deployed app (e.g. `https://you.github.io/prime-proposal-generator/`) and add this **Redirect URL** for password reset emails:

   `https://you.github.io/prime-proposal-generator/auth/reset-password`

   (Use `http://localhost:3000/auth/reset-password` for local dev.)

5. Deploy Edge Functions (for in-app user management):

```bash
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-delete-user
```

Set `SUPABASE_SERVICE_ROLE_KEY` in **Supabase Dashboard → Edge Functions → Secrets** (not in GitHub Pages build).

6. Sign in at `/auth` on the deployed app.

### Passwords

| Flow | How it works |
|------|----------------|
| **First sign-in** | Admin-created users get a temporary password and are prompted to set a new one before using the app. |
| **Change password** | Signed-in users: sidebar → **Change password** (`/account/password`). |
| **Forgot password** | Sign-in page → **Forgot password?** → email reset link → `/auth/reset-password`. |

Supabase must have **email delivery** configured (built-in or custom SMTP) for reset links to arrive.

### Roles

| Role | Capabilities |
|------|----------------|
| **Admin** | Add/remove users; edit any service or proposal |
| **User** | Create services/proposals; edit/delete only own; view and download all proposals |

Additional users are added by the admin under **Users** in the sidebar (email + temporary password). They must choose a new password on first sign-in.

## Generated Files

DOCX/PDF downloads are generated in the browser and saved locally when you click **Generate DOCX/PDF**.

## Data Storage Modes

| Mode | When | Where data lives |
|---|---|---|
| **Shared** | Supabase keys in `.env` | Supabase Postgres (all devices) |
| **Local** | No Supabase keys + `VITE_LOCAL_DEV=true` | Browser localStorage only |
