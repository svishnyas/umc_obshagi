import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужен вход" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOwner: true },
  });
  if (!me?.isOwner) {
    return NextResponse.json(
      { error: "Удалять события может только администратор" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  try {
    await prisma.event.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Событие не найдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
