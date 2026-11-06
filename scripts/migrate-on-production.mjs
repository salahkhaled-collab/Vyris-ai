// Runs `prisma migrate deploy` during the build, but only when RUN_MIGRATIONS=1.
//
// RUN_MIGRATIONS is set in Vercel for the Production environment only, so
// preview and local builds can never touch the live database. (VERCEL_ENV is
// not relied on: this project doesn't expose Vercel's system variables to the
// build, so it is unset on every build, production included.)
//
// Migrations run BEFORE `next build`. If one fails, the build fails and the
// previous deployment keeps serving traffic.
import { spawnSync } from "node:child_process";

if (process.env.RUN_MIGRATIONS !== "1") {
  console.log("[migrate] RUN_MIGRATIONS is not 1: skipping migrations");
  process.exit(0);
}

console.log("[migrate] RUN_MIGRATIONS=1: running prisma migrate deploy");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  console.error("[migrate] prisma migrate deploy failed; aborting build");
}
process.exit(result.status ?? 1);
