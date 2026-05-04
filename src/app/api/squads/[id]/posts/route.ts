import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enrichPostsWithRoomTags } from "@/lib/enrich-room-tags";
import {
  feedPostInclude,
  serializeFeedPost,
} from "@/lib/serialize-feed-post";

type Ctx = { params: Promise<{ id: string }> };

/** Лента постов сквада: читать — вся общага; писать через POST /api/posts с squadId. */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: squadId } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true, isOwner: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const squad = await prisma.roomSquad.findFirst({
    where: { id: squadId, dormId: user.dormId },
    select: { id: true },
  });
  if (!squad) {
    return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
  }

  const isOwner = user.isOwner;
  const userId = session.user.id;

  const parts: Prisma.PostWhereInput[] = [{ squadId }];
  if (!isOwner) {
    parts.push({ moderationStatus: "APPROVED" });
  }

  const where: Prisma.PostWhereInput = { AND: parts };

  const include = {
    ...feedPostInclude,
    likes: {
      where: { userId },
      select: { userId: true },
    },
  } satisfies Prisma.PostInclude;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include,
  });

  const serialized = posts.map((p) =>
    serializeFeedPost(p, { userId, isOwner }),
  );
  const payload = await enrichPostsWithRoomTags(serialized, prisma);

  return NextResponse.json(payload);
}
