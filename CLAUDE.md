# Post and Stuff Mail Portal

A CMRA in Oakland scans mail for unhoused clients; clients, approved case managers, and nonprofit admins view it online. Nonprofits pay $15/client/month.

Build guide (source of truth for features, data model, phases): https://claude.ai/artifact/CULR1wp6nocsBNiC2EW1oP

## Stack
Next.js 15 App Router + TypeScript, Tailwind + shadcn/ui, Prisma 6 + Postgres (Neon), Neon Object Storage (private bucket `mail`, S3 SDK; replaces Cloudflare R2 from the guide), Auth.js credentials login, Twilio SMS, Resend email, Vercel hosting. PWA.

## Neon setup
- Neon project "client portal" (delicate-dawn-76179495, aws-us-east-2). Services are declared in `neon.ts`.
- Local work uses the `dev` database branch (`neon checkout dev`); test data never goes on `production`.
- `neon link` / `neon checkout` write the Neon env vars to `.env.local` (git-ignored). The npm `db:*` scripts load `.env.local` for Prisma.
- Never run `neon deploy` or migrations against `production` without the owner's OK.

## Branding
Match the shop flier: dark background (#1c1a1d), neon teal (#7fe3d4), pink (#f48fb1), yellow (#ffd166); rocket logo. Shop: 4051 Foothill Blvd, Oakland, CA 94604, (415) 725-1603. Pricing on the flier: $15/month, 90-day minimum.

## Billing rules (owner decisions, locked)
- Nonprofits only. Clients are never billed; every client belongs to a partner organization that pays.
- $15 per active client per month, with a 90-day minimum per client enrollment (bill at least 3 months even if the client leaves sooner).

## Roles
- CLIENT: PMB number + 6-digit PIN
- CASE_MANAGER, ORG_ADMIN, STAFF, ADMIN: email + password
- STAFF/ADMIN also need TOTP 2-step

## Security rules (never break)
- Every server action and route that touches mail calls `canViewClient(session, clientId)` on the server. Never trust IDs from the browser.
- Mail images load only through 5-minute signed R2 URLs, after a permission check.
- Hash PINs and passwords with bcrypt. Lock login 15 min after 5 failed tries.
- Write an AuditLog row for every login, failed login, view, upload, and download.
- SMS texts never include sender or mail contents.
- Sessions expire after 30 minutes idle.
- Never put secrets in code; use .env and list every variable in .env.example.

## Working rules
- Work one phase at a time.
- Explain changes in plain language (the owner is not a developer).
- Write a test script for each feature and run it.
- Commit after each working step with a clear message.
- Ask before deleting anything or changing the database schema.
