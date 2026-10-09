# Vyris — Fix Log

_Last updated: 2026-10-09_

Each entry says what was wrong, what changed, and how it was checked. "Verified" means there was command output proving it. "Unverified" means the code is in place but nobody has seen it work in the running app.

---

## 1. `get_projects` tool used a nonexistent Prisma argument

- **File:** `src/lib/ai/tools.ts` (the `get_projects` case)
- **Problem:** `prisma.project.findMany` was called with `taskScope: { ... }` instead of `where: { ... }`. Prisma has no `taskScope` argument, so `tsc` failed with TS2322 ("not assignable to type 'never'"). A type error like this fails `next build`, so it would have blocked a Vercel deploy.
- **Fix:** changed the key back to `where:`. Commit `d2cca24`.
- **Verified:** `npx tsc --noEmit` printed no errors after the change; pushed.

## 2. `get_tasks` filtered tasks with a field the Task model doesn't have

- **File:** `src/lib/ai/tools.ts` (the `get_tasks` case)
- **Problem:** `scopeFilter()` returns `{ OR: [{ ownerId }, { teamId }] }` when a user belongs to a team. `get_tasks` spread that into `prisma.task.findMany`, but `Task` has no `teamId` column (it has `ownerId` and a `project` relation). For a user on a team the query would throw a Prisma validation error. `tsc` can't catch it because `OR` is typed as `Record<string, unknown>[]`. Solo users never hit it.
- **Fix:** replaced `...where` with `...taskScope` in `get_tasks`. `taskScope` (already defined in `runTool`) scopes tasks as `{ OR: [{ ownerId }, { project: where }] }`, i.e. through the project's team. Commit `f925e24`.
- **Verified:** `tsc` clean; every other `...where` spread (project, decision, objective, strategicBet, risk, contact) was checked against the schema and its model does have `teamId`.
- **Unverified:** the fixed query has not been run with a real team account.

## 3. Missing database tables: `Memory`, `AiConversation`, `AiMessage`

- **Problem:** migration `20261005154855_add_memory` was an empty file (0 bytes). Prisma recorded it as applied without creating anything, so `prisma migrate status` reported "Database schema is up to date" while the `Memory` table did not exist. `AiConversation` and `AiMessage` had no migration at all. Reads against `Memory` threw `P2021: table does not exist`. `/api/ai/query` swallows memory-load and history-save errors, so these failed silently.
- **How it was found:** `migrate status` said "up to date", but a row-count script failed on `p.memory.count()`. `prisma migrate diff --from-url <direct url> --to-schema-datamodel prisma/schema.prisma --script` then listed the three missing tables.
- **Fix:** added a new migration, `20261008120000_add_ai_conversations_and_memory`, that creates the three tables with `CREATE TABLE IF NOT EXISTS`, their indexes, and foreign keys. The empty `add_memory` file was left alone (editing an applied migration causes checksum drift). Commit `c9e8d8f`. Applied with `prisma migrate deploy`.
- **Verified:** after applying, a count script printed `users: 9`, `memory: 0`, `aiConversation: 0`, `aiMessage: 0` with no error. Existing user data was untouched.
- **Do not run:** the raw output of `migrate diff` also contains `DROP TABLE "conversations"` and `DROP TABLE "messages"` (old legacy tables). Those tables have not been inspected for data, so they have not been dropped. Do not run `migrate dev` against the production database, because it can prompt to reset.

## 4. Global chat memory injection added, then reverted

- `f5c8141` added `getMemories()` to `src/app/api/ai/chat/route.ts` and injected the notes into the system prompt. The call had no error handling, so a missing table would have failed every global-chat message.
- `0d426fb` reverted it. Current state: **the global chat (`/api/ai/chat`) has no memory and no tools.**
- Memory is only wired into `/api/ai/query` (the main assistant): it loads saved notes into the system prompt and exposes the `remember` tool.

## 5. Repository hygiene

- Commit `6154ef5` stopped tracking 14 `*.bundle` files and 5 stray files (`-`, `Fetch`, `Receive`, `Use`, `et -a`) that were committed by accident, and added `*.bundle` to `.gitignore`. The files are still on the developer's disk. They remain in git history.
- `VYRIS_STATUS.md` was added (`481daab`) and updated with the global AI chat entry (`3d05a7f`).

## 6. Push rejection after remote commit

- A `git push` was rejected because `origin/main` had commit `8aa5382` ("Add global AI chat and update automation layout") that wasn't local. Fixed with `git pull --rebase origin main`, then pushed. No force push was used.

---

## Open items (not fixed)

| Item | State |
|---|---|
| Memory writes | `remember` tool exists and is passed to the model, but zero `Memory` rows exist. Never confirmed to work end to end. |
| AI backend | `/api/ai/*` calls a separate Python LLM service via `PYTHON_LLM_URL`. The example config points at `localhost:8000`. Whether tool calling works in production is unknown. |
| Two AI routes | `/api/ai/query` (tools + memory) and `/api/ai/chat` (neither). The global chat uses the second one. Decide whether to point it at `/api/ai/query`. |
| `conversations` / `messages` legacy tables | Exist in the database, contents unchecked, not dropped. |
| Build does not run migrations | `build` is `next build`; `postinstall` is `prisma generate`. Migrations must be applied by hand until that changes. |
| Next.js version | `next@14.2.5` triggers a security-vulnerability warning on Vercel. Upgrade to the patched 14.2.x release, not a new major. |
| Status docs | `VYRIS_STATUS.md` still needs: Drift Signals task links (`add_task_drift_links` migration exists), the `conversations` and `transcribe` routes. |
| Users | Production has 9 users. Which are real operators is unknown. |

## How to apply migrations safely (learned the hard way)

1. Check that the new `migration.sql` is not empty: `wc -c <file>` must be above 0.
2. Set the pooled string as `DATABASE_URL` and the same string without `-pooler` as `DIRECT_URL`. Prisma CLI needs both because the schema declares `directUrl`.
3. Run `npx prisma migrate deploy` (never `migrate dev` on a live database).
4. Don't trust `migrate status` alone. Confirm with a row count on the new tables.
5. Never edit a migration that has already been applied; add a new one.
