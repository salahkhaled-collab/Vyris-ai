// Runs every tests/*.test.ts with tsx. No database or network: each test
// stubs Prisma, next-auth and fetch itself; tests/preload.ts stands in for
// the rate-limit table. Usage: npm run test:unit
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const env = {
  ...process.env,
  DATABASE_URL: "postgresql://test@localhost/test",
  DIRECT_URL: "postgresql://test@localhost/test",
  NEXTAUTH_SECRET: "test-secret",
};
const files = readdirSync(here).filter((f) => f.endsWith(".test.ts")).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", "--import", join(here, "preload.ts"), join(here, f)],
    { env, stdio: "inherit" }
  );
  if (r.status !== 0) failed++;
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
