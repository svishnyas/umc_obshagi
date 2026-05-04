import type { Prisma } from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enrichPostsWithRoomTags } from "@/lib/enrich-room-tags";
import { prisma } from "@/lib/prisma";
import {
  feedPostInclude,
  serializeFeedPost,
  type PostForFeedSerialize,
} from "@/lib/serialize-feed-post";
import { photoUrlSchema } from "@/lib/validators";
import { z } from "zod";

const createSchema = z.object({
  text: z.string().max(8000).optional().default(""),
  tag: z.enum(["g", "q", "e", "l"]),
  photoUrls: z.array(photoUrlSchema).max(12).optional().default([]),
  isAnonymous: z.boolean().optional().default(false),
  /** Пост в ленте сквада комнаты — только участники сквада. */
  squadId: z.string().cuid().optional(),
  /** Пост в общую ленту от имени сквада (squadId не задаётся). */
  asSquadId: z.string().cuid().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, isOwner: true },
      })
    : null;
  const isOwner = Boolean(me?.isOwner);
  const { searchParams } = new URL(req.url);
  const dorm = searchParams.get("dorm") ?? "all";
  const feed = searchParams.get("feed") ?? "new";
  const q = (searchParams.get("q") ?? "").trim();
  const status = (searchParams.get("status") ?? "approved").toUpperCase();
  const onlyQuestions = searchParams.get("onlyQuestions") === "1";

  const parts: Prisma.PostWhereInput[] = [];
  /* Посты сквадов — только на странице сквада, не в общей ленте. */
  parts.push({ squadId: null });
  if (!isOwner) {
    parts.push({ moderationStatus: "APPROVED" });
  } else if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    parts.push({ moderationStatus: status });
  }
  if (onlyQuestions) parts.push({ tag: "q" });
  if (dorm !== "all") {
    parts.push({ dorm: { slug: dorm } });
  }
  if (feed === "ev") {
    parts.push({ tag: "e" });
  } else if (feed === "lost") {
    parts.push({ tag: "l" });
  }
  if (q) {
    parts.push(
      isOwner
        ? {
            OR: [
              { text: { contains: q } },
              { author: { nickname: { contains: q } } },
              { asSquad: { roomLabel: { contains: q } } },
              { asSquad: { title: { contains: q } } },
            ],
          }
        : {
            OR: [
              { text: { contains: q } },
              { AND: [{ isAnonymous: false }, { author: { nickname: { contains: q } } }] },
              { asSquad: { roomLabel: { contains: q } } },
              { asSquad: { title: { contains: q } } },
            ],
          },
    );
  }

  const where: Prisma.PostWhereInput =
    parts.length > 0 ? { AND: parts } : {};

  const userId = me?.id;

  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    feed === "pop"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const include: Prisma.PostInclude = {
    ...feedPostInclude,
    ...(userId
      ? {
          likes: {
            where: { userId },
            select: { userId: true },
          },
        }
      : {}),
  };

  let page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "30", 10) || 30),
  );
  if (page > 500) page = 500;
  const skip = (page - 1) * pageSize;

  try {
    const rows = await prisma.post.findMany({
      where,
      orderBy,
      include,
      skip,
      take: pageSize + 1,
    });

    const hasMore = rows.length > pageSize;
    const slice = hasMore ? rows.slice(0, pageSize) : rows;

    const serialized = slice.map((p) =>
      serializeFeedPost(p as unknown as PostForFeedSerialize, { userId, isOwner }),
    );
    const items = await enrichPostsWithRoomTags(serialized, prisma);

    return NextResponse.json({
      items,
      page,
      pageSize,
      hasMore,
    });
  } catch (e) {
    console.error("[GET /api/posts]", e);
    if (e instanceof PrismaClientValidationError) {
      /* 200 + пустая лента: иначе useInfiniteQuery падает на !res.ok. После serverExternalPackages это не должно срабатывать. */
      return NextResponse.json({
        items: [],
        page,
        pageSize,
        hasMore: false,
      });
    }
    throw e;
  }
}

export async function POST(req: Request) {
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

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверь данные поста" }, { status: 400 });
  }

  const { text, tag, photoUrls, isAnonymous, squadId, asSquadId } = parsed.data;
  const trimmed = text.trim();
  if (!trimmed && photoUrls.length === 0) {
    return NextResponse.json(
      { error: "Добавь текст или фото" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { dorm: true },
  });
  if (!user) {
    return NextResponse.json(
      {
        error:
          "Сессия устарела: этого пользователя нет в базе (например, после пересида). Выйди и войди снова.",
        code: "STALE_SESSION",
      },
      { status: 401 },
    );
  }

  if (squadId && asSquadId) {
    return NextResponse.json(
      { error: "Нельзя одновременно стена сквада и пост от комнаты в общую ленту" },
      { status: 400 },
    );
  }

  let resolvedSquadId: string | null = null;
  let resolvedAsSquadId: string | null = null;

  if (squadId) {
    const squad = await prisma.roomSquad.findFirst({
      where: { id: squadId, dormId: user.dormId },
      select: { id: true },
    });
    if (!squad) {
      return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
    }
    const member = await prisma.roomSquadMember.findUnique({
      where: {
        squadId_userId: { squadId: squad.id, userId: user.id },
      },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Писать могут только участники сквада" },
        { status: 403 },
      );
    }
    resolvedSquadId = squad.id;
  } else if (asSquadId) {
    if (isAnonymous) {
      return NextResponse.json(
        { error: "Пост от комнаты нельзя сделать анонимным" },
        { status: 400 },
      );
    }
    const voiceSquad = await prisma.roomSquad.findFirst({
      where: { id: asSquadId, dormId: user.dormId },
      select: { id: true },
    });
    if (!voiceSquad) {
      return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
    }
    const member = await prisma.roomSquadMember.findUnique({
      where: {
        squadId_userId: { squadId: voiceSquad.id, userId: user.id },
      },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Писать от имени комнаты могут только её участники" },
        { status: 403 },
      );
    }
    resolvedAsSquadId = voiceSquad.id;
  }

  try {
    const created = await prisma.post.create({
      data: {
        authorId: user.id,
        dormId: user.dormId,
        squadId: resolvedSquadId,
        asSquadId: resolvedAsSquadId,
        tag,
        /* В скваде комнаты или от имени комнаты — без анонима. */
        isAnonymous:
          resolvedSquadId || resolvedAsSquadId ? false : isAnonymous,
        moderationStatus: tag === "q" ? "PENDING" : "APPROVED",
        text: trimmed,
        photos: {
          create: photoUrls.map((url, i) => ({ url, order: i })),
        },
      },
      select: { id: true, moderationStatus: true },
    });

    const row = await prisma.post.findUniqueOrThrow({
      where: { id: created.id },
      include: { ...feedPostInclude },
    });

    const body = serializeFeedPost(row as unknown as PostForFeedSerialize, {
      userId: session.user.id,
      isOwner: Boolean(user.isOwner),
    });

    const [enriched] = await enrichPostsWithRoomTags([body], prisma);

    return NextResponse.json({
      ...enriched,
      moderationMessage:
        created.moderationStatus === "PENDING"
          ? "Вопрос отправлен на модерацию и появится после проверки."
          : undefined,
    });
  } catch (e) {
    console.error("[POST /api/posts]", e);
    if (e instanceof PrismaClientValidationError) {
      return NextResponse.json(
        {
          error:
            "Ошибка Prisma (часто кэш Turbopack). Удали папку .next, выполни npx prisma generate и перезапусти npm run dev.",
        },
        { status: 503 },
      );
    }
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2022") {
        return NextResponse.json(
          {
            error:
              "Схема базы устарела. Останови dev-сервер и выполни: npx prisma db push && npx prisma generate",
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Не удалось сохранить пост в базе. Попробуй ещё раз." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Пост не сохранился. Попробуй позже." },
      { status: 500 },
    );
  }
}
