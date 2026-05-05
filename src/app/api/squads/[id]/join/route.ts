import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRoomLabel } from "@/lib/room-squad";
import { ROOM_SQUAD_MAX_MEMBERS } from "@/lib/room-squad";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: squadId } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true, room: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const squad = await prisma.roomSquad.findFirst({
    where: { id: squadId, dormId: user.dormId },
    include: { _count: { select: { members: true } } },
  });
  if (!squad) {
    return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
  }

  const myRoom = user.room ? normalizeRoomLabel(user.room) : "";
  const squadRoom = normalizeRoomLabel(squad.roomLabel);
  if (!myRoom) {
    return NextResponse.json(
      { error: "Чтобы вступить в сквад, укажи номер комнаты в профиле" },
      { status: 403 },
    );
  }
  if (myRoom !== squadRoom) {
    return NextResponse.json(
      { error: "Вступать можно только в сквад своей комнаты" },
      { status: 403 },
    );
  }

  const alreadyInRoomSquad = await prisma.roomSquadMember.findFirst({
    where: {
      userId: session.user.id,
      squad: { dormId: user.dormId },
    },
    select: { squadId: true },
  });
  if (alreadyInRoomSquad && alreadyInRoomSquad.squadId !== squadId) {
    return NextResponse.json(
      { error: "Ты уже состоишь в скваде своей комнаты" },
      { status: 409 },
    );
  }

  const existing = await prisma.roomSquadMember.findUnique({
    where: {
      squadId_userId: { squadId, userId: session.user.id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Ты уже в скваде" }, { status: 409 });
  }

  if (squad._count.members >= ROOM_SQUAD_MAX_MEMBERS) {
    return NextResponse.json(
      { error: `Сквад полон (макс. ${ROOM_SQUAD_MAX_MEMBERS} человек)` },
      { status: 403 },
    );
  }

  await prisma.roomSquadMember.create({
    data: {
      squadId,
      userId: session.user.id,
      role: "MEMBER",
    },
  });

  return NextResponse.json({ ok: true });
}
