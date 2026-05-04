import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTimeAgoRu } from "@/lib/utils";
import { photoUrlSchema } from "@/lib/validators";
import { z } from "zod";

const patchSchema = z.object({
  avatarUrl: photoUrlSchema.nullable().optional(),
  room: z.string().max(32).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      dorm: true,
      posts: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          _count: { select: { likes: true } },
        },
      },
      _count: {
        select: {
          posts: true,
          comments: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const likesReceived = await prisma.like.count({
    where: {
      post: { authorId: user.id },
    },
  });

  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    room: user.room,
    avatarUrl: user.avatarUrl,
    dormSlug: user.dorm.slug,
    dormName: user.dorm.name,
    stats: {
      posts: user._count.posts,
      comments: user._count.comments,
      likesReceived,
    },
    posts: user.posts.map((p) => ({
      id: p.id,
      tag: p.tag,
      text: p.text,
      timeLabel: formatTimeAgoRu(p.createdAt),
      likes: p._count.likes,
    })),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const data: { avatarUrl?: string | null; room?: string | null } = {};
  if (parsed.data.avatarUrl !== undefined) {
    data.avatarUrl = parsed.data.avatarUrl;
  }
  if (parsed.data.room !== undefined) {
    data.room = parsed.data.room?.trim() || null;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    include: { dorm: { select: { slug: true } } },
  });

  return NextResponse.json({
    id: user.id,
    nickname: user.nickname,
    room: user.room,
    avatarUrl: user.avatarUrl,
    dormSlug: user.dorm.slug,
  });
}
