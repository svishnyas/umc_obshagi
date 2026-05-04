import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DORMS } from "@/lib/constants";

const ONLINE_MS = 2 * 60 * 1000;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const threshold = new Date(Date.now() - ONLINE_MS);

  const users = await prisma.user.findMany({
    where: {
      lastSeenAt: { gte: threshold },
      dorm: { slug: session.user.dormSlug },
    },
    include: { dorm: { select: { slug: true } } },
    orderBy: { lastSeenAt: "desc" },
    take: 24,
  });

  return NextResponse.json({
    onlineCount: users.length,
    users: users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      dormSlug: u.dorm.slug,
      dormName: DORMS[u.dorm.slug]?.name ?? u.dorm.slug,
      avatarUrl: u.avatarUrl,
    })),
  });
}
