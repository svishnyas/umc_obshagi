import { DORMS } from "./constants";

export function ini(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function dormColor(slug: string): string {
  return DORMS[slug]?.color ?? "#1ECC8A";
}

export function dormBg(slug: string): string {
  const c = dormColor(slug);
  return `${c}18`;
}

export function formatTimeAgoRu(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "только что";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} д назад`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} нед назад`;
  return date.toLocaleDateString("ru-RU");
}
