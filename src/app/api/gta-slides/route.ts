import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg)$/i;

/** Slug общаги в приложении → возможные имена папок в public/gta_pic/ (порядок приоритета) */
const FOLDER_CANDIDATES: Record<"1" | "2" | "3", string[]> = {
  "1": ["1", "Volxonka", "Volkhonka", "Volhonka", "Волхонка"],
  "2": ["2", "Danilovskaya", "Даниловская"],
  "3": ["3", "Begovaya", "Беговая"],
};

/**
 * Сканирует public/gta_pic/ и для каждой общаги отдаёт URL картинок.
 * Имя папки может быть 1/2/3 или как у тебя: Volxonka, Danilovskaya, Begovaya.
 */
export async function GET() {
  const base = path.join(process.cwd(), "public", "gta_pic");
  let dirNames: string[] = [];
  try {
    const entries = await readdir(base, { withFileTypes: true });
    dirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return NextResponse.json({ "1": [], "2": [], "3": [] });
  }

  const lowerToActual = new Map<string, string>();
  for (const n of dirNames) {
    lowerToActual.set(n.toLowerCase(), n);
  }

  function resolveFolder(candidates: string[]): string | null {
    for (const c of candidates) {
      const actual = lowerToActual.get(c.toLowerCase());
      if (actual) return actual;
    }
    return null;
  }

  const out: Record<string, string[]> = {};

  for (const slug of ["1", "2", "3"] as const) {
    const folder = resolveFolder(FOLDER_CANDIDATES[slug]);
    if (!folder) {
      out[slug] = [];
      continue;
    }
    try {
      const files = await readdir(path.join(base, folder));
      const urls = files
        .filter((f) => IMAGE_EXT.test(f))
        .sort((a, b) => a.localeCompare(b, "ru"))
        .map(
          (f) =>
            `/gta_pic/${encodeURIComponent(folder)}/${encodeURIComponent(f)}`,
        );
      out[slug] = urls;
    } catch {
      out[slug] = [];
    }
  }

  return NextResponse.json(out);
}
