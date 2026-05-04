import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const postSchema = z.object({
  toSquadId: z.string().min(1),
  text: z.string().min(1).max(4000).trim(),
});

/** Переписка между сквадами одной общаги (участник «от»-сквада пишет «в»-скваду). */
export async function GET(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: squadId } = await ctx.params;
  const peer = new URL(req.url).searchParams.get("peer");
  if (!peer) {
    return NextResponse.json(
      { error: "Укажи peer — id другого сквада" },
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

  const inSquad = await prisma.roomSquadMember.findUnique({
    where: { squadId_userId: { squadId, userId: session.user.id } },
  });
  if (!inSquad) {
    return NextResponse.json(
      { error: "Только участники сквада видят переписку" },
      { status: 403 },
    );
  }

  const self = await prisma.roomSquad.findFirst({
    where: { id: squadId, dormId: user.dormId },
  });
  const other = await prisma.roomSquad.findFirst({
    where: { id: peer, dormId: user.dormId },
  });
  if (!self || !other || self.id === other.id) {
    return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
  }

  const rows = await prisma.squadRoomMessage.findMany({
    where: {
      dormId: user.dormId,
      OR: [
        { fromSquadId: squadId, toSquadId: peer },
        { fromSquadId: peer, toSquadId: squadId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      author: { select: { nickname: true } },
    },
  });

  return NextResponse.json({
    messages: rows.map((m) => ({
      id: m.id,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      fromSquadId: m.fromSquadId,
      toSquadId: m.toSquadId,
      authorName: m.author.nickname,
      outgoing: m.fromSquadId === squadId,
    })),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: fromSquadId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Пустое сообщение или нет адресата" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true, nickname: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const member = await prisma.roomSquadMember.findUnique({
    where: {
      squadId_userId: { squadId: fromSquadId, userId: session.user.id },
    },
  });
  if (!member) {
    return NextResponse.json(
      { error: "Писать можно только от имени своего сквада" },
      { status: 403 },
    );
  }

  const fromSquad = await prisma.roomSquad.findFirst({
    where: { id: fromSquadId, dormId: user.dormId },
  });
  const toSquad = await prisma.roomSquad.findFirst({
    where: { id: parsed.data.toSquadId, dormId: user.dormId },
  });
  if (!fromSquad || !toSquad || fromSquad.id === toSquad.id) {
    return NextResponse.json({ error: "Нельзя отправить в этот сквад" }, { status: 400 });
  }

  const msg = await prisma.squadRoomMessage.create({
    data: {
      dormId: user.dormId,
      fromSquadId: fromSquad.id,
      toSquadId: toSquad.id,
      authorId: session.user.id,
      text: parsed.data.text,
    },
    include: { author: { select: { nickname: true } } },
  });

  const toMembers = await prisma.roomSquadMember.findMany({
    where: { squadId: toSquad.id },
    select: { userId: true },
  });
  const link = `/squads/${toSquad.id}`;
  for (const m of toMembers) {
    if (m.userId === session.user.id) continue;
    await prisma.notification.create({
      data: {
        userId: m.userId,
        text: `${user.nickname} из комн. ${fromSquad.roomLabel}: ${parsed.data.text.slice(0, 90)}${parsed.data.text.length > 90 ? "…" : ""}`,
        link,
      },
    });
  }

  return NextResponse.json({
    message: {
      id: msg.id,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      fromSquadId: msg.fromSquadId,
      toSquadId: msg.toSquadId,
      authorName: msg.author.nickname,
      outgoing: true,
    },
  });
}
