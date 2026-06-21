# Database + Google integrations setup

## 1. Get a Postgres database

**Easiest: Neon (free, no install)**
1. Go to https://neon.tech, create a project.
2. Copy the connection string (starts with `postgresql://`).

**Or local Postgres:**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb vela
# DATABASE_URL=postgresql://localhost:5432/vela
```

## 2. Enable both Google APIs

In Google Cloud Console, for the same project as before:
- APIs & Services → Library → enable **Google Calendar API** (if not already)
- APIs & Services → Library → enable **Gmail API**

Both must be enabled or the corresponding integration will fail with a
403, even though OAuth itself succeeds.

## 3. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```
DATABASE_URL=<your connection string>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=...
```

## 4. Install, generate, migrate

```bash
npm install                          # runs `prisma generate` via postinstall
npx prisma migrate dev --name init   # creates all tables
```

## 5. (Optional) Browse your data

```bash
npm run db:studio
```
Opens Prisma Studio at http://localhost:5555.

## 6. Run the app

```bash
npm run dev
```

## If you connected Google BEFORE this update

The OAuth scope list changed (added `gmail.readonly`, and the session
strategy changed from JWT to database-backed). Existing sign-ins won't
have the new scope. To fix:

1. Go to https://myaccount.google.com/permissions
2. Find "Vela" (or your app name) and remove access.
3. Sign out of Vela and sign back in — you'll be asked to consent to
   both Calendar and Gmail access this time.

## What's wired up

- **Sessions**: database-backed via Prisma adapter (`Session`, `Account`
  tables), not JWT. Tokens for Google APIs live in `Account` and are
  refreshed automatically (`src/lib/google-token.ts`).
- **Calendar**: `/api/calendar` reads today's events from your primary
  calendar, shown in the Command Center's schedule panel.
- **Gmail**: `/api/gmail` reads the 15 most recent inbox messages
  (sender, subject, snippet, read/unread) — metadata only, never the
  full email body. Shown in a dedicated "Email" section on the Inbox
  page, kept separate from Vela's own system notifications below it.
- **Onboarding profile** (role, workspace type): lives on the `User`
  row, via `GET/PATCH /api/profile`.
- **Team**: choosing "Team" in onboarding creates a `Team` row. The
  `/team` page shows real teammates (anyone who's signed in and been
  assigned the same `teamId` — no invite flow yet, see below) and
  persists messages in `TeamMessage`.

## Inviting teammates (still manual)

No invite-link flow yet. To add a second member:
1. Have them sign in once (creates their `User` row).
2. In Prisma Studio, set their `teamId` to match yours.

## Gmail integration notes / limitations

- Read-only. Vela cannot send, delete, or modify anything in Gmail —
  the OAuth scope (`gmail.readonly`) doesn't permit it.
- Fetches only `INBOX` messages, newest 15, metadata only (From,
  Subject, Date headers + snippet) — never downloads full message
  bodies or attachments.
- Each inbox load makes up to 16 Gmail API calls (1 list + up to 15
  detail fetches). Fine for personal use; would need batching or
  caching before any real multi-user scale.
- Nothing is persisted to the database — messages are fetched live on
  every page load, same as Calendar events.

## Team invites

Two ways to invite someone, both create a row in the `Invite` table:

1. **Shareable link** — generates a `/invite/<token>` URL. Works with
   zero extra setup. Anyone who opens it, signs in with Google, and
   accepts is added to your team.
2. **Email invite** — same link, but also emailed via Resend.

### Setting up Resend (optional — link invites work without it)

1. Sign up at https://resend.com (free tier: 100 emails/day, 3000/month).
2. Create an API key, add it as `RESEND_API_KEY` in `.env.local`.
3. By default, sending uses `onboarding@resend.dev`, which **only
   delivers to the email address you signed up to Resend with** — fine
   for testing, not for inviting real teammates.
4. For real delivery to any address: verify your own domain in Resend
   (Domains → Add Domain → add their DNS records), then set
   `RESEND_FROM_EMAIL="Vela <invites@yourdomain.com>"`.

If `RESEND_API_KEY` is missing, email invites silently fall back to
"invite created, copy the link yourself" — nothing breaks, you just
don't get the email.

### Invite behavior

- Invites expire after 7 days (`INVITE_EXPIRY_DAYS` in
  `src/app/api/invites/route.ts`).
- An email-targeted invite can only be accepted by a Google account
  matching that exact email — prevents a forwarded invite link being
  used by the wrong person.
- A link-only invite (no email) can be accepted by whoever opens it —
  treat it like a Zoom link, anyone with it gets in.
- Accepting sets the invitee's `workspaceType` to `TEAM` automatically,
  so they skip the "Personal or Team?" onboarding question.

## Projects, Meetings, Comms

- **Projects**: real CRUD against Postgres (`Project`, `Task` models).
  Create projects, optionally share with your team if you're in one,
  add/cycle/delete tasks inline. After adding these models, run:
  ```bash
  npx prisma migrate dev --name add_projects_tasks
  ```
- **Meetings**: no new data — reuses `/api/calendar` with a new
  `?range=week` parameter, grouped by day. If Calendar isn't connected,
  this page shows the same "Connect Google Calendar" prompt as the
  dashboard.
- **Comms**: deliberately thin. It's a log/index pointing at Inbox
  (Gmail), Automation (AI drafts), and Team (sent messages) rather than
  a fourth messaging surface — building a real fourth inbox would have
  duplicated what those three pages already do.

Executive Ops was intentionally skipped this round — no content spec
was given, so building it would have meant inventing filler.

## Calendar, Contacts, Documents, and the three placeholders

- **Calendar**: month grid view, reuses `/api/calendar?range=month` (no
  new model). Known limitation: prev/next month buttons only change
  the grid's visual labels — the underlying fetch always returns the
  *current* real-world month. Cross-month navigation needs the API to
  accept an explicit year/month param; not wired yet.
- **Contacts**: new `Contact` model — people outside your team
  (investors, press, clients). Real CRUD, optional team-sharing and
  tagging.
- **Documents**: new `Document` model. Files are stored as raw bytes
  directly in Postgres (`Bytes` column), capped at 8MB per file. This
  is fine for personal-scale PDFs/docs but is NOT how you'd do this at
  real scale — move to S3/R2/Vercel Blob before this needs to handle
  many users or larger files.
- **Strategic Planning, Business Development, Personal Brand**: built
  as explicit placeholders, not filler dressed up as features. Each
  page says plainly that it isn't defined yet and lists a few directions
  it could go (including merging into existing pages like Decisions,
  Contacts, or Comms). Describe what should actually live on one of
  these and it gets built for real.

After pulling these changes:
```bash
npx prisma migrate dev --name add_contacts_documents
```

## Real email + chat from Team page

- **"Email" mode on the Team page now sends real email** via Resend,
  using the same `sendEmail` helper as invites. Requires
  `RESEND_FROM_EMAIL` set to a verified-domain address — without it,
  this falls back to "saved to the conversation, email couldn't be
  sent" rather than failing the whole request.
- Message content is HTML-escaped before going into the email template
  (prevents anyone injecting markup via a team message that gets
  emailed).
- Sending only succeeds if the recipient is actually on your team
  (server-side check) — you can't email arbitrary userIds through this
  endpoint.
- **"Message" mode** ("chatting") was already real (persisted in
  `TeamMessage`) since the Database step. What was missing: messages
  sent by a teammate didn't appear without a manual page refresh. Added
  simple 5-second polling — not real-time/websocket, but good enough
  for this kind of async chat. If you want true real-time later, that's
  a websocket or Server-Sent Events upgrade, not a small tweak.
