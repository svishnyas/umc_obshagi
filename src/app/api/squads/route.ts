import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  bannerColorSchema,
  normalizeRoomLabel,
  roomLabelSchema,
} from "@/lib/room-squad";
import { z } from "zod";

const HEX_COLOR = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const createBodySchema = z.object({
  roomLabel: z.string(),
  title: z.string().trim().max(80).optional().default(""),
  /** Пустая строка от `<input type="color">` без выбора — как отсутствие значения */
  bannerColor: z
    .string()
    .optional()
    .transform((s) => {
      const t = s?.trim() ?? "";
      if (!t || !HEX_COLOR.test(t)) return "#1ECC8A";
      return t.length === 4
        ? `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`
        : t;
    })
    .pipe(bannerColorSchema),
});

function squadsPrismaUserMessage(e: unknown): string | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return "Сквад для этой комнаты уже есть — присоединись к нему";
    }
    if (e.code === "P2021") {
      return "В базе нет таблиц сквадов. Останови dev-сервер и выполни: npx prisma db push";
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/no such table:\s*RoomSquad|no such table:\s*main\.RoomSquad/i.test(msg)) {
    return "В базе нет таблиц сквадов. Останови dev-сервер и выполни: npx prisma db push";
  }
  return null;
}

/** Список сквадов твоей общаги + создание (только своя общага). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  let squads;
  try {
    squads = await prisma.roomSquad.findMany({
      where: { dormId: user.dormId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId: session.user.id },
          select: { id: true, role: true },
        },
      },
    });
  } catch (e) {
    const hint = squadsPrismaUserMessage(e);
    if (hint) {
      return NextResponse.json({ error: hint }, { status: 503 });
    }
    console.error("[GET /api/squads]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить сквады." },
      { status: 500 },
    );
  }

  const payload = squads.map((s) => ({
    id: s.id,
    roomLabel: s.roomLabel,
    title: s.title,
    bannerColor: s.bannerColor,
    bannerImageUrl: s.bannerImageUrl,
    avatarUrl: s.avatarUrl,
    memberCount: s._count.members,
    isMember: s.members.length > 0,
    myRole: s.members[0]?.role ?? null,
    createdAt: s.createdAt.toISOString(),
  }));

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg =
      first?.message === "Required"
        ? "Заполни обязательные поля"
        : (first?.message ?? "Проверь данные");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const roomLabelRaw = normalizeRoomLabel(parsed.data.roomLabel);
  const labelOk = roomLabelSchema.safeParse(roomLabelRaw);
  if (!labelOk.success) {
    const fe = labelOk.error.flatten().formErrors[0];
    const ie = labelOk.error.issues[0]?.message;
    return NextResponse.json(
      { error: fe ?? ie ?? "Некорректный номер" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const existing = await prisma.roomSquad.findUnique({
    where: {
      dormId_roomLabel: { dormId: user.dormId, roomLabel: roomLabelRaw },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Сквад для этой комнаты уже есть — присоединись к нему" },
      { status: 409 },
    );
  }

  let squad;
  try {
    squad = await prisma.roomSquad.create({
      data: {
        dormId: user.dormId,
        roomLabel: roomLabelRaw,
        title: parsed.data.title.trim(),
        bannerColor: parsed.data.bannerColor,
        members: {
          create: {
            userId: session.user.id,
            role: "LEADER",
          },
        },
      },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
    });
  } catch (e) {
    const hint = squadsPrismaUserMessage(e);
    if (hint) {
      const status = hint.includes("уже есть") ? 409 : 503;
      return NextResponse.json({ error: hint }, { status });
    }
    console.error("[POST /api/squads]", e);
    return NextResponse.json(
      { error: "Не удалось создать сквад. Смотри консоль сервера." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: squad.id,
    roomLabel: squad.roomLabel,
    title: squad.title,
    bannerColor: squad.bannerColor,
    bannerImageUrl: squad.bannerImageUrl,
    avatarUrl: squad.avatarUrl,
    memberCount: squad._count.members,
    isMember: true,
    myRole: squad.members[0]?.role ?? "LEADER",
    createdAt: squad.createdAt.toISOString(),
  });
}
