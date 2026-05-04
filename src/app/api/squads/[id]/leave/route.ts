import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: squadId } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const squad = await prisma.roomSquad.findFirst({
    where: { id: squadId, dormId: user.dormId },
  });
  if (!squad) {
    return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
  }

  const membership = await prisma.roomSquadMember.findUnique({
    where: {
      squadId_userId: { squadId, userId: session.user.id },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "Ты не в этом скваде" }, { status: 400 });
  }

  await prisma.roomSquadMember.delete({
    where: { id: membership.id },
  });

  const remaining = await prisma.roomSquadMember.findMany({
    where: { squadId },
    orderBy: { joinedAt: "asc" },
  });

  if (remaining.length === 0) {
    await prisma.roomSquad.delete({ where: { id: squadId } });
    return NextResponse.json({ ok: true, disbanded: true });
  }

  if (membership.role === "LEADER") {
    const nextLeader = remaining[0];
    if (nextLeader) {
      await prisma.roomSquadMember.update({
        where: { id: nextLeader.id },
        data: { role: "LEADER" },
      });
    }
  }

  return NextResponse.json({ ok: true, disbanded: false });
}
