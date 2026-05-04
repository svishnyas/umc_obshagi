import { z } from "zod";
import { photoUrlSchema } from "@/lib/validators";

/** Максимум участников в скваде комнаты. */
export const ROOM_SQUAD_MAX_MEMBERS = 6;

/** Номер комнаты: буквы, цифры, точка и дефис. */
export const roomLabelSchema = z
  .string()
  .trim()
  .min(1, "Укажи номер комнаты")
  .max(12, "Слишком длинный номер")
  .regex(
    /^[0-9A-Za-zА-Яа-яЁё.\-]+$/,
    "Только буквы, цифры, точка и дефис",
  );

export const bannerColorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "Цвет в формате #RRGGBB");

export const squadBannerPatchSchema = z.object({
  title: z.string().trim().max(80).optional(),
  bannerColor: bannerColorSchema.optional(),
  bannerImageUrl: photoUrlSchema.optional().nullable(),
  avatarUrl: photoUrlSchema.optional().nullable(),
});

export function normalizeRoomLabel(raw: string): string {
  return raw.trim();
}
