import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: postId } = await ctx.params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Пост не найден" }, { status: 404 });
  }
  if (post.squadId) {
    const inSquad = await prisma.roomSquadMember.findUnique({
      where: {
        squadId_userId: { squadId: post.squadId, userId: session.user.id },
      },
    });
    if (!inSquad) {
      return NextResponse.json(
        { error: "Лайкать могут только участники сквада" },
        { status: 403 },
      );
    }
  }
  if (post.moderationStatus !== "APPROVED" && !session.user.isOwner) {
    return NextResponse.json(
      { error: "Нельзя лайкать пост до модерации" },
      { status: 403 },
    );
  }

  const existing = await prisma.like.findFirst({
    where: { postId, userId: session.user.id },
  });

  if (!existing) {
    await prisma.like.create({
      data: { postId, userId: session.user.id },
    });

    if (post.authorId !== session.user.id) {
      const link = post.squadId
        ? `/squads/${post.squadId}#post-${postId}`
        : `/feed#post-${postId}`;
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          text: `${session.user.name ?? "Кто-то"} лайкнул твой пост`,
          link,
        },
      });
    }
  }

  const likesCount = await prisma.like.count({ where: { postId } });

  return NextResponse.json({ liked: true, likesCount });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: postId } = await ctx.params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { moderationStatus: true, squadId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Пост не найден" }, { status: 404 });
  }
  if (post.squadId) {
    const inSquad = await prisma.roomSquadMember.findUnique({
      where: {
        squadId_userId: { squadId: post.squadId, userId: session.user.id },
      },
    });
    if (!inSquad) {
      return NextResponse.json(
        { error: "Лайкать могут только участники сквада" },
        { status: 403 },
      );
    }
  }
  if (post.moderationStatus !== "APPROVED" && !session.user.isOwner) {
    return NextResponse.json(
      { error: "Нельзя снимать лайк до модерации" },
      { status: 403 },
    );
  }

  await prisma.like.deleteMany({
    where: { postId, userId: session.user.id },
  });

  const likesCount = await prisma.like.count({ where: { postId } });

  return NextResponse.json({ liked: false, likesCount });
}
