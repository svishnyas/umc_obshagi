/**
 * После npm install: пробуем prisma generate. На Windows EPERM на движке
 * не должен ронять весь install — подскажем команду `npm run db:sync`.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const retry = join(root, "scripts", "prisma-generate-retry.mjs");

const r = spawnSync(process.execPath, [retry], {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});

if (r.status !== 0) {
  console.error(
    "\n[postinstall] Prisma Client не сгенерировался (часто блокировка DLL). Закрой dev-сервер и выполни:\n  npm run db:sync\n",
  );
}
process.exit(0);
