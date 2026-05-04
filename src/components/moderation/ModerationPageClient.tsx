"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type { FeedPost } from "@/lib/types";
import { Lightbox } from "@/components/feed/Lightbox";
import { PostCard } from "@/components/feed/PostCard";

type StatusFilter = "PENDING" | "APPROVED" | "REJECTED";

export function ModerationPageClient() {
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [lbSrc, setLbSrc] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["moderation", status],
    queryFn: async (): Promise<FeedPost[]> => {
      const u = new URL("/api/posts", window.location.origin);
      u.searchParams.set("status", status);
      u.searchParams.set("onlyQuestions", "1");
      u.searchParams.set("page", "1");
      u.searchParams.set("pageSize", "50");
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error("moderation");
      const json = (await res.json()) as { items: FeedPost[] };
      return json.items ?? [];
    },
    refetchInterval: 15_000,
  });

  return (
    <>
      <div className="moderation-page">
        <div className="moderation-head">
          <div>
            <h1 className="events-h1">Модерация вопросов</h1>
            <p className="events-sub">
              Новые вопросы сначала попадают сюда. Одобренные появятся в общей ленте.
            </p>
          </div>
          <Link className="events-back" href="/feed">
            К ленте
          </Link>
        </div>

        <div className="moderation-tabs">
          <button
            type="button"
            className={`moderation-tab ${status === "PENDING" ? "on" : ""}`}
            onClick={() => setStatus("PENDING")}
          >
            На проверке
          </button>
          <button
            type="button"
            className={`moderation-tab ${status === "APPROVED" ? "on" : ""}`}
            onClick={() => setStatus("APPROVED")}
          >
            Одобрено
          </button>
          <button
            type="button"
            className={`moderation-tab ${status === "REJECTED" ? "on" : ""}`}
            onClick={() => setStatus("REJECTED")}
          >
            Отклонено
          </button>
        </div>

        <div>
          {isLoading ? (
            <div className="empty">Загрузка...</div>
          ) : posts.length === 0 ? (
            <div className="empty">По этому фильтру вопросов пока нет.</div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} onOpenPhoto={setLbSrc} />)
          )}
        </div>
      </div>
      <Lightbox src={lbSrc} onClose={() => setLbSrc(null)} />
    </>
  );
}
