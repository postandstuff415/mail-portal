# Post and Stuff Mail Portal

A CMRA in Oakland scans mail for unhoused clients; clients, approved case managers, and nonprofit admins view it online. Nonprofits pay $15/client/month.

Build guide (source of truth for features, data model, phases): https://claude.ai/artifact/CULR1wp6nocsBNiC2EW1oP

## Stack
Next.js 15 App Router + TypeScript, Tailwind + shadcn/ui, Prisma + Postgres (Neon), Cloudflare R2 (private bucket, S3 SDK), Auth.js credentials login, Twilio SMS, Resend email, Vercel hosting. PWA.

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
