import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/constants";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Counts, trending (7d), sidebar stats */
export async function GET() {
  const since = new Date(Date.now() - WEEK_MS);

  const [totalPosts, totalComments, dorms, postsWeek, onlineThreshold] =
    await Promise.all([
      prisma.post.count({
        where: { moderationStatus: "APPROVED", squadId: null },
      }),
      prisma.comment.count(),
      prisma.dorm.findMany({
        select: {
          slug: true,
          posts: {
            where: { moderationStatus: "APPROVED", squadId: null },
            select: { id: true },
          },
        },
      }),
      prisma.post.findMany({
        where: {
          createdAt: { gte: since },
          moderationStatus: "APPROVED",
          squadId: null,
        },
        select: {
          tag: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: {
          lastSeenAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
        },
      }),
    ]);

  const counts = {
    all: totalPosts,
    bySlug: Object.fromEntries(dorms.map((d) => [d.slug, d.posts.length])) as Record<
      string,
      number
    >,
  };

  const tagScore: Record<string, number> = { g: 0, q: 0, e: 0, l: 0 };
  for (const p of postsWeek) {
    tagScore[p.tag] =
      (tagScore[p.tag] ?? 0) + p._count.likes + p._count.comments * 2 + 1;
  }

  const trending = Object.entries(tagScore)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, score], i) => ({
      rank: i + 1,
      tag,
      label: TAGS[tag]?.label ?? tag,
      score,
    }));

  return NextResponse.json({
    counts,
    stats: {
      totalPosts,
      totalComments,
      online: onlineThreshold,
    },
    trending,
  });
}
