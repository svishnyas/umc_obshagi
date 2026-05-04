import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { squadBannerPatchSchema } from "@/lib/room-squad";

type Ctx = { params: Promise<{ id: string }> };

async function loadSquadForUser(squadId: string, userDormId: string) {
  return prisma.roomSquad.findFirst({
    where: { id: squadId, dormId: userDormId },
    include: {
      dorm: { select: { slug: true, name: true } },
      _count: { select: { members: true } },
      members: {
        select: {
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              nickname: true,
              room: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

/** Карточка сквада: читать может любой из той же общаги. */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const squad = await loadSquadForUser(id, user.dormId);
  if (!squad) {
    return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
  }

  const myMembership = squad.members.find((m) => m.user.id === session.user.id);
  const isMember = Boolean(myMembership);
  const isLeader = myMembership?.role === "LEADER";

  return NextResponse.json({
    id: squad.id,
    dormSlug: squad.dorm.slug,
    dormName: squad.dorm.name,
    roomLabel: squad.roomLabel,
    title: squad.title,
    bannerColor: squad.bannerColor,
    bannerImageUrl: squad.bannerImageUrl,
    avatarUrl: squad.avatarUrl,
    memberCount: squad._count.members,
    isMember,
    isLeader,
    members: squad.members.map((m) => ({
      userId: m.user.id,
      nickname: m.user.nickname,
      room: m.user.room,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdAt: squad.createdAt.toISOString(),
  });
}

/** Обновление шапки: только лидер сквада. */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = squadBannerPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверь поля шапки" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dormId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const squad = await prisma.roomSquad.findFirst({
    where: { id, dormId: user.dormId },
  });
  if (!squad) {
    return NextResponse.json({ error: "Сквад не найден" }, { status: 404 });
  }

  const membership = await prisma.roomSquadMember.findUnique({
    where: {
      squadId_userId: { squadId: id, userId: session.user.id },
    },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Только участники сквада могут менять данные" },
      { status: 403 },
    );
  }

  const patchKeys = (
    ["title", "bannerColor", "bannerImageUrl", "avatarUrl"] as const
  ).filter((k) => parsed.data[k] !== undefined);
  const avatarOnly =
    patchKeys.length === 1 && patchKeys[0] === "avatarUrl";

  if (!avatarOnly && membership.role !== "LEADER") {
    return NextResponse.json(
      { error: "Только лидер может менять оформление" },
      { status: 403 },
    );
  }

  const data: {
    title?: string;
    bannerColor?: string;
    bannerImageUrl?: string | null;
    avatarUrl?: string | null;
  } = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.bannerColor !== undefined) data.bannerColor = parsed.data.bannerColor;
  if (parsed.data.bannerImageUrl !== undefined)
    data.bannerImageUrl = parsed.data.bannerImageUrl;
  if (parsed.data.avatarUrl !== undefined) data.avatarUrl = parsed.data.avatarUrl;

  const updated = await prisma.roomSquad.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    roomLabel: updated.roomLabel,
    title: updated.title,
    bannerColor: updated.bannerColor,
    bannerImageUrl: updated.bannerImageUrl,
    avatarUrl: updated.avatarUrl,
  });
}
