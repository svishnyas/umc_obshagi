import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DORMS } from "@/lib/constants";
import { encodeEventMeta, formatEventDateLabel, parseEventMeta } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startsAt: z.string().datetime(),
  place: z.string().trim().max(100).optional().default(""),
  dormSlug: z.enum(["all", "1", "2", "3"]),
});

function eventColor(dormSlug: "all" | "1" | "2" | "3"): string {
  if (dormSlug === "all") return "#1ECC8A";
  return DORMS[dormSlug]?.color ?? "#1ECC8A";
}

function mapEvent(e: {
  id: string;
  title: string;
  dateText: string;
  color: string;
  dorm: { slug: string; name: string } | null;
}) {
  const meta = parseEventMeta(e.dateText);
  return {
    id: e.id,
    title: e.title,
    dateText: formatEventDateLabel(meta.startsAtIso, e.dateText),
    startsAt: meta.startsAtIso,
    place: meta.place,
    color: e.color,
    dormSlug: e.dorm?.slug ?? null,
    dormLabel:
      e.dorm == null
        ? "Все общаги"
        : DORMS[e.dorm.slug]?.name ?? e.dorm.name,
  };
}

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { title: "asc" },
    include: { dorm: { select: { slug: true, name: true } } },
  });

  const mapped = events.map(mapEvent);
  mapped.sort((a, b) => {
    const ad = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });
  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужен вход" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.issues.map((i) => i.message).join(" · ") || "Некорректные данные";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { title, startsAt, place, dormSlug } = parsed.data;
  const color = eventColor(dormSlug);

  let dormId: string | null = null;
  if (dormSlug !== "all") {
    const dorm = await prisma.dorm.findUnique({ where: { slug: dormSlug } });
    if (!dorm) {
      return NextResponse.json({ error: "Общага не найдена" }, { status: 400 });
    }
    dormId = dorm.id;
  }

  const created = await prisma.event.create({
    data: { title, dateText: encodeEventMeta(startsAt, place), color, dormId },
    include: { dorm: { select: { slug: true, name: true } } },
  });

  return NextResponse.json(mapEvent(created), { status: 201 });
}
