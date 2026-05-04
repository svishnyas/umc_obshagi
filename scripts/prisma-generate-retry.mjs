/**
 * Prisma на Windows часто падает с EPERM при rename query_engine-*.dll.node,
 * если держат файл dev-сервер, антивирус или IDE. Несколько попыток с паузой.
 * Вызываем локальный prisma из node_modules (без npx в PATH).
 */
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");

const attempts = 12;
const pauseMs = 2500;

async function main() {
  for (let i = 1; i <= attempts; i++) {
    try {
      execFileSync(process.execPath, [prismaCli, "generate"], {
        stdio: "inherit",
        cwd: root,
        env: process.env,
      });
      process.exit(0);
    } catch {
      console.error(
        `\n[prisma-generate-retry] Попытка ${i}/${attempts} не удалась (часто EPERM). Пауза ${pauseMs / 1000} с…`,
      );
      if (i < attempts) await delay(pauseMs);
    }
  }

  console.error(
    "\n[prisma-generate-retry] Все попытки исчерпаны. Закрой Next.js (терминал с npm run dev), перезапусти IDE или добавь исключение антивируса на node_modules/.prisma, затем снова: npm run postinstall\n",
  );
  process.exit(1);
}

main();
