import { z } from "zod";

/** Локальные файлы: `/uploads/...`; S3: `https://...` */
export const photoUrlSchema = z.string().refine(
  (s) => {
    const t = s.trim();
    if (!t) return false;
    if (t.startsWith("/") && !t.includes("..") && t.length > 1) return true;
    try {
      const u = new URL(t);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "Некорректный адрес фото" },
);
