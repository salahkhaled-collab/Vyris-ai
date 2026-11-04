// Runs `prisma migrate deploy` during the Vercel build, but only for production.
// Previews and local builds skip it, so they can never touch the live database.
// Migrations are applied BEFORE `next build`; if one fails the build fails and
// the previous deployment keeps serving traffic.
import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV;

if (env !== "production") {
  console.log(`[migrate] VERCEL_ENV=${env ?? "unset"}: skipping migrations`);
  process.exit(0);
}

console.log("[migrate] production build: running prisma migrate deploy");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("[migrate] prisma migrate deploy failed; aborting build");
}
process.exit(result.status ?? 1);
