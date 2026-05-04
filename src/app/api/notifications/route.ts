import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTimeAgoRu } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = items.filter((n) => !n.readAt).length;

  return NextResponse.json({
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      text: n.text,
      timeLabel: formatTimeAgoRu(n.createdAt),
      read: !!n.readAt,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
