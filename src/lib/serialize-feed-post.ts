import type { Prisma } from "@prisma/client";
import { formatTimeAgoRu } from "@/lib/utils";

/** Shape returned by /api/posts and squad post lists — keep in sync with FeedPost. */
export type SerializedFeedPost = {
  /** Для подстановки @комната; перед отдачей клиенту обогащается и может быть снято. */
  dormId: string;
  moderationStatus: string;
  isAnonymous: boolean;
  id: string;
  squadId: string | null;
  asSquadId: string | null;
  /** Кто написал пост, если он опубликован от имени комнаты (общая лента). */
  roomVoiceAuthor: {
    nickname: string;
    room: string | null;
    dormSlug: string;
    isOwner: boolean;
  } | null;
  roomVoiceRoomLabel: string | null;
  author: {
    nickname: string;
    room: string | null;
    avatarUrl: string | null;
    dormSlug: string;
    isOwner: boolean;
  };
  anonymousAuthor: {
    nickname: string;
    room: string | null;
    dormSlug: string;
  } | null;
  dormSlug: string;
  tag: string;
  text: string;
  /** Заполняется enrich-room-tags перед ответом API */
  textParts?: import("@/lib/room-mentions").RoomTextPart[];
  createdAt: string;
  timeLabel: string;
  photos: { url: string; order: number }[];
  comments: {
    id: string;
    author: string;
    dormSlug: string;
    text: string;
    parentId: string | null;
    replyToAuthor: string | null;
    /** Заполняется enrich-room-tags перед ответом API */
    textParts?: import("@/lib/room-mentions").RoomTextPart[];
  }[];
  likesCount: number;
  commentsCount: number;
  liked: boolean;
};

export const feedPostInclude = {
  author: {
    select: {
      id: true,
      nickname: true,
      room: true,
      avatarUrl: true,
      isOwner: true,
      dorm: { select: { slug: true } },
    },
  },
  dorm: { select: { slug: true, name: true } },
  photos: { orderBy: { order: "asc" as const } },
  comments: {
    orderBy: { createdAt: "asc" as const },
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
  },
  _count: { select: { likes: true, comments: true } },
  asSquad: {
    select: {
      id: true,
      roomLabel: true,
      title: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.PostInclude;

export type PostForFeedSerialize = Prisma.PostGetPayload<{
  include: typeof feedPostInclude;
}> & {
  likes?: { userId: string }[];
};

export function serializeFeedPost(
  p: PostForFeedSerialize,
  opts: { userId?: string; isOwner: boolean },
): SerializedFeedPost {
  const { userId, isOwner } = opts;
  const roomVoice = Boolean(p.asSquadId && p.asSquad);
  const showAnon = p.isAnonymous && !roomVoice;

  return {
    dormId: p.dormId,
    moderationStatus: p.moderationStatus,
    isAnonymous: showAnon,
    id: p.id,
    squadId: p.squadId ?? null,
    asSquadId: p.asSquadId ?? null,
    roomVoiceAuthor: roomVoice
      ? {
          nickname: p.author.nickname,
          room: p.author.room,
          dormSlug: p.author.dorm.slug,
          isOwner: p.author.isOwner,
        }
      : null,
    roomVoiceRoomLabel: roomVoice ? p.asSquad!.roomLabel : null,
    author: roomVoice
      ? {
          nickname: `Комната ${p.asSquad!.roomLabel}`,
          room: null,
          avatarUrl: p.asSquad!.avatarUrl,
          dormSlug: p.author.dorm.slug,
          isOwner: false,
        }
      : {
          nickname: showAnon ? "Аноним" : p.author.nickname,
          room: showAnon ? null : p.author.room,
          avatarUrl: showAnon ? null : p.author.avatarUrl,
          dormSlug: p.author.dorm.slug,
          isOwner: showAnon ? false : p.author.isOwner,
        },
    anonymousAuthor:
      showAnon && isOwner
        ? {
            nickname: p.author.nickname,
            room: p.author.room,
            dormSlug: p.author.dorm.slug,
          }
        : null,
    dormSlug: p.dorm.slug,
    tag: p.tag,
    text: p.text,
    createdAt: p.createdAt.toISOString(),
    timeLabel: formatTimeAgoRu(p.createdAt),
    photos: p.photos.map((ph) => ({ url: ph.url, order: ph.order })),
    comments: p.comments.map((c) => ({
      id: c.id,
      author: c.author.nickname,
      dormSlug: c.author.dorm.slug,
      text: c.text,
      parentId: c.parentId,
      replyToAuthor: c.parent?.author?.nickname ?? null,
    })),
    likesCount: p._count.likes,
    commentsCount: p._count.comments,
    liked: userId ? (p.likes?.length ?? 0) > 0 : false,
  };
}
