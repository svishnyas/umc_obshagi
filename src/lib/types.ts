import type { RoomTextPart } from "@/lib/room-mentions";

export type FeedPost = {
  id: string;
  /** Если задан — пост из ленты сквада, не из общей ленты. */
  squadId?: string | null;
  /** Пост в общей ленте от имени комнаты (участник выбрал сквад в композере). */
  asSquadId?: string | null;
  roomVoiceAuthor?: {
    nickname: string;
    room: string | null;
    dormSlug: string;
    isOwner: boolean;
  } | null;
  roomVoiceRoomLabel?: string | null;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  isAnonymous: boolean;
  author: {
    nickname: string;
    room: string | null;
    avatarUrl: string | null;
    dormSlug: string;
    isOwner: boolean;
  };
  anonymousAuthor?: {
    nickname: string;
    room: string | null;
    dormSlug: string;
  } | null;
  dormSlug: string;
  tag: string;
  text: string;
  textParts?: RoomTextPart[];
  createdAt: string;
  timeLabel: string;
  photos: { url: string; order: number }[];
  comments: {
    id: string;
    author: string;
    dormSlug: string;
    text: string;
    textParts?: RoomTextPart[];
    parentId: string | null;
    /** Никнейм автора комментария, на который ответили */
    replyToAuthor: string | null;
  }[];
  likesCount: number;
  commentsCount: number;
  liked: boolean;
};

/** Ответ `GET /api/posts` (пагинация). */
export type PostsFeedPage = {
  items: FeedPost[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};
