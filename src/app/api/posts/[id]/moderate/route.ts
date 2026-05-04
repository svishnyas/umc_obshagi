import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOwner: true },
  });
  if (!me?.isOwner) {
    return NextResponse.json(
      { error: "Только владелец может модерировать вопросы" },
      { status: 403 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректное действие" }, { status: 400 });
  }

  const { id: postId } = await ctx.params;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Пост не найден" }, { status: 404 });
  }
  if (post.tag !== "q") {
    return NextResponse.json(
      { error: "Модерация доступна только для вопросов" },
      { status: 400 },
    );
  }

  const moderationStatus =
    parsed.data.action === "approve" ? "APPROVED" : "REJECTED";
  await prisma.post.update({
    where: { id: postId },
    data: { moderationStatus },
  });

  return NextResponse.json({ ok: true, moderationStatus });
}
