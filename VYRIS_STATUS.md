# Vyris — Project Status

_Last updated: 2026-10-08_

Vyris (formerly Vela / ChiefAI) is an AI-powered "Chief of Staff" SaaS for solo operators running online businesses (e-commerce, agency, content).

## MVP scope

Strategic Planning + Decision Support only. The rest of the original nav (Inbox, Projects, Calendar, Business Development, Personal Brand, Meetings, Communications, AI & Automation, Contacts, Documents) is pulled from the sidebar. The code is still in the repo, not deleted.

## Stack

- Next.js
- NextAuth (PrismaAdapter, JWT sessions, Google OAuth + email/password via CredentialsProvider and bcryptjs)
- Prisma ORM + Neon PostgreSQL, managed with `prisma migrate dev` / `prisma migrate deploy` (not `db push`)
- Tailwind CSS with a custom design token system
- Dev environments: Windows/PowerShell and GitHub Codespace

## Done (verified end-to-end)

### Strategic Planning
- Objectives and Key Results on real data (`Objective` / `KeyResult` models). Progress is computed from key results, never stored.
- Routes: `GET/POST /api/objectives`, `PATCH /api/key-results/[id]`
- Inline-editable key results
- Strategic Bets on real data (`StrategicBet`): manual status (on-track / at-risk / off-track), create form, status dropdown
- Routes: `GET/POST /api/strategic-bets`, `PATCH /api/strategic-bets/[id]`
- Delete with click-to-confirm for Objectives and Bets (API routes + trash-icon UI)

### Decision Support
- `Decision` / `DecisionOption` models
- Routes: `GET/POST /api/decisions`, `PATCH /api/decisions/[id]`
- Create-decision form; choose an option; resolve

### Auth and routing
- Email/password auth added alongside Google OAuth
- Middleware now uses NextAuth `withAuth` and gates all protected routes behind a real token. The old "DEV MODE" bypass is gone.
- Root cause of the earlier inconsistent behavior: `NEXTAUTH_SECRET` was missing from `.env`
- Verified cold in incognito: unauthenticated `/decisions` redirects to `/login`
- All `/dashboard` redirects (middleware, login default, `app/page.tsx`, onboarding, invite-accept) now go to `/strategy`
- `/dashboard` (Command Center) is a hardcoded mockup and is not linked in nav

### Database
- Migrated from `db push` to Prisma migrations, baselined without data loss

**Windows gotchas hit while doing this:**
- PowerShell `>` writes UTF-16, which Prisma can't read
- `Out-File -Encoding utf8` adds a BOM, which Postgres rejects
- Fix: write migration files with `[System.IO.File]::WriteAllText` and the BOM disabled

### UI
- Navigation collapsed into "Work" and "Advisory" sections
- Unbuilt pages commented out
- Hardcoded values replaced with design tokens
- Palette settled on a warm taupe/dark theme in-app (marketing site uses cream / burgundy / serif headings)

## In progress / NOT done

- **Per-user AI memory:** Memory Prisma model, `remember` tool, and notes injected into the system prompt. **Not finished.** The live AI endpoint is `/api/ai/query`. The unused `/api/chat` draft route was removed.
- **Waitlist page upgrade** (vyris-waitlist.vercel.app): keep the existing style and every detail. Planned: a portal animation with apps like Gmail flowing through a portal to Vyris.

## Not built (deliberate)

- **Drift Signals:** needs a Task-to-Objective/Bet link that doesn't exist yet. Cut until real users ask for it.

## Idea backlog

- **Project-to-tasks planner:** take a project and its delivery date and generate scheduled tasks, using this planning checklist as the template: scope/alternatives/feasibility; divide into tasks; estimate resources; preliminary schedule; communication plan; standards and procedures; risk assessment; preliminary budget; statement of work; baseline project plan.

## Go-to-market

- Pricing (rough, not final): $29–39/month, single tier, no permanent free plan, 14-day full-access trial
- Plan: test the number directly with the first 5–10 real operators
- First build-in-public post is live on X (Strategic Planning screenshot, early access offered to 5 operators)

## Open questions / risks

- Is the 14-day trial actually enforced in code? No evidence yet, and there is no billing flow.
- No logging of what early users actually do.
- No confirmed real users yet.

## Next up (proposed)

1. Finish and verify the per-user memory feature
2. Trial enforcement + billing
3. Cold signup walkthrough as a stranger (signup → first objective → first decision), fixing every stall
4. Basic usage/event logging
5. Onboard the first 5 operators

## Changelog

- **2026-10-08:** Status file created; memory feature marked not done.
