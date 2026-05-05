"use client";

import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DORMS, TAGS } from "@/lib/constants";
import type { FeedPost } from "@/lib/types";
import { dormBg, dormColor, ini } from "@/lib/utils";
import { RichRoomText } from "@/components/ui/RichRoomText";

const DEFAULT_INVALIDATION: string[][] = [["posts"], ["overview"]];

type Props = {
  post: FeedPost;
  onOpenPhoto: (src: string) => void;
  /** Какие react-query ключи сбрасывать после лайка/коммента/модерации */
  invalidateQueryKeys?: string[][];
};

export function PostCard({
  post,
  onOpenPhoto,
  invalidateQueryKeys = DEFAULT_INVALIDATION,
}: Props) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [cmtOpen, setCmtOpen] = useState(post.commentsCount > 0);
  const [cmtText, setCmtText] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(
    null,
  );

  const dc = post.dormSlug;
  const tagInfo = TAGS[post.tag] ?? TAGS.g;
  const isOwner = Boolean(session?.user?.isOwner);
  const isPendingQuestion = post.tag === "q" && post.moderationStatus === "PENDING";
  const authorLabel = post.author.nickname;

  const roomVoiceFrom =
    post.roomVoiceAuthor && post.roomVoiceAuthor.nickname;

  const roomMono =
    post.roomVoiceRoomLabel?.replace(/\s+/g, "").slice(0, 4) || "?";

  async function toggleLike() {
    setBusy(true);
    try {
      const method = post.liked ? "DELETE" : "POST";
      const res = await fetch(`/api/posts/${post.id}/like`, { method });
      if (res.ok) {
        for (const key of invalidateQueryKeys) {
          await qc.invalidateQueries({ queryKey: [...key] });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function addCmt() {
    const t = cmtText.trim();
    if (!t) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          ...(replyTo ? { parentId: replyTo.id } : {}),
        }),
      });
      if (res.ok) {
        setCmtText("");
        setReplyTo(null);
        setCmtOpen(true);
        for (const key of invalidateQueryKeys) {
          await qc.invalidateQueries({ queryKey: [...key] });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function moderate(action: "approve" | "reject") {
    if (!isOwner) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        for (const key of invalidateQueryKeys) {
          await qc.invalidateQueries({ queryKey: [...key] });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const n = post.photos.length;
  const singlePhoto = n === 1;

  return (
    <div className="post" id={`post-${post.id}`}>
      <div className="post-head">
        <div className="post-av">
          {post.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatarUrl} alt="" />
          ) : (
            <span
              style={{
                background: dormBg(post.author.dormSlug),
                color: dormColor(post.author.dormSlug),
              }}
            >
              {post.roomVoiceAuthor ? roomMono : ini(post.author.nickname)}
            </span>
          )}
        </div>
        <div>
          <div className="post-name">
            {authorLabel}
            {post.author.room && post.author.room !== "—"
              ? ` · комн. ${post.author.room}`
              : ""}
          </div>
          {post.roomVoiceAuthor && roomVoiceFrom ? (
            <div className="post-room-voice-from">
              от {roomVoiceFrom}
              {post.roomVoiceAuthor.room && post.roomVoiceAuthor.room !== "—"
                ? ` · комн. ${post.roomVoiceAuthor.room}`
                : ""}
            </div>
          ) : null}
          <div className="post-meta">
            {post.timeLabel}
            <span
              className="dpill"
              style={{
                background: dormBg(dc),
                color: dormColor(dc),
              }}
            >
              {DORMS[dc]?.name ?? dc}
            </span>
          </div>
        </div>
        <span className={`post-tag ${tagInfo.cls}`}>{tagInfo.label}</span>
      </div>
      {post.text ? (
        <div className="post-txt">
          {post.textParts?.length ? (
            <RichRoomText parts={post.textParts} dormSlug={post.dormSlug} />
          ) : (
            post.text
          )}
        </div>
      ) : null}
      {isPendingQuestion ? (
        <div className="post-moderation-note">
          Вопрос на модерации. В ленте его видит только владелец.
        </div>
      ) : null}
      {isOwner && isPendingQuestion ? (
        <div className="post-moderation-actions">
          <button
            type="button"
            className="mod-btn mod-approve"
            onClick={() => moderate("approve")}
            disabled={busy}
          >
            Одобрить
          </button>
          <button
            type="button"
            className="mod-btn mod-reject"
            onClick={() => moderate("reject")}
            disabled={busy}
          >
            Отклонить
          </button>
        </div>
      ) : null}
      {n > 0 ? (
        <div className={`photos-grid${singlePhoto ? " photos-grid--single" : ""}`}>
          {post.photos.map((ph) => (
            <button
              key={ph.url}
              type="button"
              className={`pphoto${singlePhoto ? " pphoto--single" : ""}`}
              onClick={() => onOpenPhoto(ph.url)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="post-actions">
        <button
          type="button"
          className={`act ${post.liked ? "liked" : ""}`}
          onClick={toggleLike}
          disabled={busy || !session || isPendingQuestion}
        >
          <svg viewBox="0 0 14 14" aria-hidden>
            <path d="M7 12C7 12 1 8.5 1 4.5a3 3 0 016 0 3 3 0 016 0C13 8.5 7 12 7 12z" />
          </svg>
          {post.likesCount}
        </button>
        <button
          type="button"
          className="act"
          onClick={() => setCmtOpen((v) => !v)}
          disabled={isPendingQuestion}
        >
          <svg viewBox="0 0 14 14" aria-hidden>
            <path d="M1 2h12v8H8l-3 3v-3H1z" />
          </svg>
          {post.commentsCount}
        </button>
        <span className="post-time-mini">{post.timeLabel}</span>
      </div>
      <div
        className="comments"
        id={`cw-${post.id}`}
        style={{ display: cmtOpen ? "block" : "none" }}
      >
        <div id={`cl-${post.id}`}>
          {post.comments.map((c) => {
            const isReply = Boolean(c.parentId);
            const replyLabel = c.replyToAuthor;
            return (
              <div
                key={c.id}
                className={`cmt${isReply ? " cmt--reply" : ""}`}
              >
                <div
                  className="cmt-av"
                  style={{
                    background: dormBg(c.dormSlug),
                    color: dormColor(c.dormSlug),
                  }}
                >
                  {ini(c.author)}
                </div>
                <div className="cmt-bubble">
                  {replyLabel ? (
                    <div className="cmt-reply-to">
                      Ответ для{" "}
                      <span className="cmt-reply-to-name">{replyLabel}</span>
                    </div>
                  ) : null}
                  <div className="cmt-author">{c.author}</div>
                  <div className="cmt-txt">
                    {c.textParts?.length ? (
                      <RichRoomText
                        parts={c.textParts}
                        dormSlug={post.dormSlug}
                      />
                    ) : (
                      c.text
                    )}
                  </div>
                  <button
                    type="button"
                    className="cmt-reply-btn"
                    onClick={() => {
                      setReplyTo({ id: c.id, author: c.author });
                      setCmtOpen(true);
                      requestAnimationFrame(() => {
                        document.getElementById(`ci-${post.id}`)?.focus();
                      });
                    }}
                    disabled={!session || isPendingQuestion}
                  >
                    Ответить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {replyTo ? (
          <div className="cmt-replying">
            <span>
              Ответ <strong>{replyTo.author}</strong>
            </span>
            <button
              type="button"
              className="cmt-replying-x"
              onClick={() => setReplyTo(null)}
              aria-label="Отменить ответ"
            >
              ×
            </button>
          </div>
        ) : null}
        <div className="cmt-inp-row">
          <input
            className="cmt-inp"
            id={`ci-${post.id}`}
            placeholder={
              replyTo
                ? `Ответ для ${replyTo.author}…`
                : "Написать комментарий..."
            }
            value={cmtText}
            onChange={(e) => setCmtText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCmt();
            }}
            disabled={!session || busy || isPendingQuestion}
          />
          <button
            type="button"
            className="cmt-send"
            onClick={addCmt}
            disabled={!session || busy || isPendingQuestion}
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
