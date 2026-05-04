import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTimeAgoRu } from "@/lib/utils";
import { z } from "zod";

const bodySchema = z.object({
  text: z.string().min(1).max(4000).trim(),
  parentId: z.string().min(1).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id: postId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Пустой комментарий" }, { status: 400 });
  }

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
        { error: "Комментировать могут только участники сквада" },
        { status: 403 },
      );
    }
  }
  if (post.moderationStatus !== "APPROVED" && !session.user.isOwner) {
    return NextResponse.json(
      { error: "Нельзя комментировать пост до модерации" },
      { status: 403 },
    );
  }

  const author = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { dorm: { select: { slug: true } } },
  });
  if (!author) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  let parentId: string | null = null;
  let parentCommentAuthorId: string | null = null;
  if (parsed.data.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parsed.data.parentId, postId },
      select: { id: true, authorId: true },
    });
    if (!parent) {
      return NextResponse.json(
        { error: "Комментарий для ответа не найден" },
        { status: 400 },
      );
    }
    parentId = parent.id;
    parentCommentAuthorId = parent.authorId;
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: session.user.id,
      text: parsed.data.text,
      parentId,
    },
    include: {
      author: {
        select: {
          nickname: true,
          dorm: { select: { slug: true } },
        },
      },
      parent: {
        select: {
          author: { select: { nickname: true } },
        },
      },
    },
  });

  const link = post.squadId
    ? `/squads/${post.squadId}#post-${postId}`
    : `/feed#post-${postId}`;

  if (
    parentCommentAuthorId &&
    parentCommentAuthorId !== session.user.id
  ) {
    await prisma.notification.create({
      data: {
        userId: parentCommentAuthorId,
        text: `${author.nickname} ответил на твой комментарий`,
        link,
      },
    });
  } else if (!parentId && post.authorId !== session.user.id) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        text: `${author.nickname} прокомментировал: "${parsed.data.text.slice(0, 80)}${parsed.data.text.length > 80 ? "…" : ""}"`,
        link,
      },
    });
  }

  const commentsCount = await prisma.comment.count({ where: { postId } });

  return NextResponse.json({
    comment: {
      id: comment.id,
      author: comment.author.nickname,
      dormSlug: comment.author.dorm.slug,
      text: comment.text,
      parentId: comment.parentId,
      replyToAuthor: comment.parent?.author?.nickname ?? null,
      createdAt: comment.createdAt.toISOString(),
      timeLabel: formatTimeAgoRu(comment.createdAt),
    },
    commentsCount,
  });
}
