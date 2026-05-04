import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { type ZodError, z } from "zod";
import { prisma } from "@/lib/prisma";
import { DORM_SLUGS } from "@/lib/constants";

const registerSchema = z.object({
  nickname: z.string().min(1).max(80).trim(),
  password: z.string().min(6).max(128),
  dormSlug: z.enum(DORM_SLUGS),
  dormCode: z.string().regex(/^\d{6}$/),
  room: z.string().max(32).optional().nullable(),
});

const fieldLabel: Record<string, string> = {
  nickname: "Имя",
  password: "Пароль",
  dormSlug: "Общага",
  dormCode: "Код общаги",
  room: "Комната",
};

function registerValidationMessages(err: ZodError): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    const label = fieldLabel[key] ?? key;
    const line = `${label}: ${issue.message}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  return lines;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const details = registerValidationMessages(parsed.error);
      return NextResponse.json(
        {
          error: details[0] ?? "Проверь поля формы",
          details: details.length > 1 ? details : undefined,
        },
        { status: 400 },
      );
    }

    const { nickname, password, dormSlug, dormCode, room } = parsed.data;

    const dorm = await prisma.dorm.findUnique({ where: { slug: dormSlug } });
    if (!dorm) {
      return NextResponse.json({ error: "Общага не найдена" }, { status: 400 });
    }

    const codeOk = await bcrypt.compare(dormCode, dorm.accessCodeHash);
    if (!codeOk) {
      return NextResponse.json(
        { error: `Этот код не для ${dorm.name}. Проверь код.` },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: {
        nickname_dormId: { nickname, dormId: dorm.id },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Такой ник уже занят в этой общаге" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nickname,
        dormId: dorm.id,
        room: room?.trim() || null,
        passwordHash,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        text: `Добро пожаловать в УМЦобщаги, ${nickname}! Ты теперь в ${dorm.name}.`,
      },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
