import type { PrismaClient } from "@prisma/client";
import type { SerializedFeedPost } from "@/lib/serialize-feed-post";
import type { FeedPost } from "@/lib/types";
import {
  collectRoomTagKeysFromTexts,
  parseRoomMentionParts,
} from "@/lib/room-mentions";

/** Добавляет textParts посту и комментариям; убирает dormId из ответа клиенту. */
export async function enrichPostsWithRoomTags(
  items: SerializedFeedPost[],
  prisma: PrismaClient,
): Promise<FeedPost[]> {
  const texts: Array<{ text: string; dormId: string }> = [];
  for (const p of items) {
    texts.push({ text: p.text, dormId: p.dormId });
    for (const c of p.comments) {
      texts.push({ text: c.text, dormId: p.dormId });
    }
  }

  const pairs = collectRoomTagKeysFromTexts(texts);
  const squadByKey = new Map<string, string | null>();

  if (pairs.length > 0) {
    const squads = await prisma.roomSquad.findMany({
      where: {
        OR: pairs.map(({ dormId, roomLabel }) => ({
          dormId,
          roomLabel,
        })),
      },
      select: { id: true, dormId: true, roomLabel: true },
    });
    for (const s of squads) {
      squadByKey.set(`${s.dormId}:${s.roomLabel}`, s.id);
    }
    for (const { dormId, roomLabel } of pairs) {
      const k = `${dormId}:${roomLabel}`;
      if (!squadByKey.has(k)) squadByKey.set(k, null);
    }
  }

  return items.map((p) => {
    const { dormId, ...rest } = p;
    return {
      ...rest,
      textParts: parseRoomMentionParts(p.text, dormId, squadByKey),
      comments: p.comments.map((c) => ({
        ...c,
        textParts: parseRoomMentionParts(c.text, dormId, squadByKey),
      })),
    } as FeedPost;
  });
}
