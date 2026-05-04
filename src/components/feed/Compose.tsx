"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { RichRoomText } from "@/components/ui/RichRoomText";
import { previewRoomMentionParts } from "@/lib/room-mentions";
import { dormBg, dormColor, ini } from "@/lib/utils";

function roomMonogram(label: string): string {
  const t = label.replace(/\s+/g, "").slice(0, 4);
  return t || "?";
}

export function Compose() {
  const { data: session, status } = useSession();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [tag, setTag] = useState("g");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonToast, setAnonToast] = useState<string | null>(null);
  const anonToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [feedVoiceSquadId, setFeedVoiceSquadId] = useState("");
  const fileQueueRef = useRef<File[]>([]);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropName, setCropName] = useState("");

  type SquadListRow = {
    id: string;
    roomLabel: string;
    avatarUrl: string | null;
    isMember: boolean;
  };
  const { data: squadsList = [] } = useQuery<SquadListRow[]>({
    queryKey: ["squads"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/squads");
      if (!res.ok) return [];
      return (await res.json()) as SquadListRow[];
    },
  });
  const voiceSquads = squadsList.filter((s) => s.isMember);
  const voiceSquad = feedVoiceSquadId
    ? voiceSquads.find((s) => s.id === feedVoiceSquadId)
    : undefined;

  const mentionPreview = useMemo(
    () => previewRoomMentionParts(text, squadsList),
    [text, squadsList],
  );

  useEffect(() => {
    return () => {
      if (anonToastTimer.current) clearTimeout(anonToastTimer.current);
    };
  }, []);

  function setAnonymous(next: boolean) {
    if (next && feedVoiceSquadId) setFeedVoiceSquadId("");
    setIsAnonymous(next);
    if (!next) {
      setAnonToast(null);
      if (anonToastTimer.current) {
        clearTimeout(anonToastTimer.current);
        anonToastTimer.current = null;
      }
      return;
    }
    if (anonToastTimer.current) clearTimeout(anonToastTimer.current);
    setAnonToast("Пост выйдет без имени и аватара");
    anonToastTimer.current = setTimeout(() => {
      setAnonToast(null);
      anonToastTimer.current = null;
    }, 4200);
  }

  const slug = session?.user?.dormSlug ?? "1";
  const name = session?.user?.name ?? "?";
  const av = session?.user?.image;

  function cancelCropQueue() {
    fileQueueRef.current = [];
    setCropOpen(false);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    setCropName("");
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length === 0) return;
    fileQueueRef.current = files;
    const first = fileQueueRef.current.shift();
    if (!first) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(first));
    setCropName(first.name);
    setCropOpen(true);
  }

  async function uploadOneCropped(file: File) {
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", "post");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(
        typeof data.error === "string"
          ? data.error
          : "Не удалось загрузить фото",
      );
      return;
    }
    if (data.url) setPending((p) => [...p, data.url]);
  }

  async function onCropModalComplete(file: File) {
    setBusy(true);
    try {
      await uploadOneCropped(file);
      const next = fileQueueRef.current.shift();
      if (next) {
        if (cropSrc) URL.revokeObjectURL(cropSrc);
        setCropSrc(URL.createObjectURL(next));
        setCropName(next.name);
      } else {
        cancelCropQueue();
      }
    } finally {
      setBusy(false);
    }
  }

  function rmPh(i: number) {
    setPending((p) => p.filter((_, j) => j !== i));
  }

  async function submitPost() {
    const trimmed = text.trim();
    if (!trimmed && pending.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          tag,
          photoUrls: pending,
          isAnonymous,
          ...(feedVoiceSquadId
            ? { asSquadId: feedVoiceSquadId }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setText("");
        setPending([]);
        setIsAnonymous(false);
        setFeedVoiceSquadId("");
        setAnonToast(null);
        if (anonToastTimer.current) {
          clearTimeout(anonToastTimer.current);
          anonToastTimer.current = null;
        }
        if (typeof data.moderationMessage === "string") {
          setErr(data.moderationMessage);
        }
        await qc.invalidateQueries({ queryKey: ["posts"] });
        await qc.invalidateQueries({ queryKey: ["overview"] });
      } else {
        if (
          res.status === 401 &&
          typeof data === "object" &&
          data !== null &&
          (data as { code?: string }).code === "STALE_SESSION"
        ) {
          await signOut({ callbackUrl: "/auth" });
          return;
        }
        setErr(
          typeof data.error === "string" ? data.error : "Пост не сохранился",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="compose" id="compose-box">
      <div className="compose-row">
        <div className="compose-av" id="comp-av">
          {voiceSquad?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={voiceSquad.avatarUrl}
              alt=""
              width={38}
              height={38}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : voiceSquad ? (
            <span style={{ color: dormColor(slug), background: dormBg(slug) }}>
              {roomMonogram(voiceSquad.roomLabel)}
            </span>
          ) : av ? (
            <Image src={av} alt="" width={38} height={38} unoptimized />
          ) : (
            <span style={{ color: dormColor(slug), background: dormBg(slug) }}>
              {ini(name)}
            </span>
          )}
        </div>
        <textarea
          className="compose-ta"
          id="comp-ta"
          placeholder="Что нового в общаге? Поделись с соседями..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
      </div>
      {voiceSquads.length > 0 ? (
        <div className="compose-voice">
          <label htmlFor="compose-voice-squad">Публиковать как</label>
          <select
            id="compose-voice-squad"
            value={feedVoiceSquadId}
            onChange={(e) => {
              const v = e.target.value;
              setFeedVoiceSquadId(v);
              if (v) setIsAnonymous(false);
            }}
            disabled={busy}
          >
            <option value="">От себя</option>
            {voiceSquads.map((s) => (
              <option key={s.id} value={s.id}>
                Комната {s.roomLabel}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {err ? (
        <div
          className="auth-err visible"
          style={{ marginTop: 10, marginBottom: 4, fontSize: 13 }}
        >
          {err}
        </div>
      ) : null}
      {/@/.test(text) ? (
        <div style={{ marginTop: 8, marginBottom: 6 }}>
          <div
            className="squads-muted"
            style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}
          >
            Упоминания комнат (@301)
          </div>
          <div className="compose-mention-preview">
            <RichRoomText parts={mentionPreview} dormSlug={slug} />
          </div>
        </div>
      ) : null}
      <div id="ph-prev" className="photo-prev">
        {pending.map((s, i) => (
          <div key={s} className="ph-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s} alt="" />
            <button
              type="button"
              className="ph-rm"
              onClick={() => rmPh(i)}
              aria-label="Удалить фото"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>
      {pending.length > 0 ? (
        <div className="compose-post-preview">
          <div className="compose-post-preview-title">Превью в ленте</div>
          <div
            className={`photos-grid${pending.length === 1 ? " photos-grid--single" : ""}`}
          >
            {pending.map((src) => (
              <div
                key={`preview-${src}`}
                className={`pphoto${pending.length === 1 ? " pphoto--single" : ""}`}
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </div>
            ))}
          </div>
          <p className="compose-post-preview-note">
            Формат кадра выбирается в окне обрезки (4:5, 1:1, 4:3, 3:4, 16:9).
          </p>
        </div>
      ) : null}
      <div className="compose-foot">
        <div className="compose-bottom">
          <select
            className="c-tag"
            id="comp-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="g">Общее</option>
            <option value="q">Вопрос</option>
            <option value="e">Мероприятие</option>
            <option value="l">Потеряно</option>
          </select>
          <button
            type="button"
            className="c-action"
            onClick={() => document.getElementById("ph-inp")?.click()}
            disabled={busy}
          >
            <svg viewBox="0 0 16 16" aria-hidden>
              <rect x="1" y="3" width="14" height="10" rx="2" />
              <circle cx="5.5" cy="8" r="1.5" />
              <path d="M10 5l3 4H7L5 7" />
            </svg>
            Фото
          </button>
          <div className="anon-ctrl">
            <button
              type="button"
              className={`anon-switch${isAnonymous ? " on" : ""}`}
              role="switch"
              aria-checked={isAnonymous}
              aria-label="Анонимный пост"
              disabled={busy || Boolean(feedVoiceSquadId)}
              onClick={() => setAnonymous(!isAnonymous)}
            >
              <span className="anon-switch-track" aria-hidden>
                <span className="anon-switch-thumb" />
              </span>
            </button>
            <span className={`anon-switch-caption${isAnonymous ? " on" : ""}`}>
              Аноним
            </span>
          </div>
          <input
            type="file"
            id="ph-inp"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handlePhotos}
          />
          <button
            type="button"
            className="pub-btn"
            onClick={submitPost}
            disabled={busy}
          >
            Опубликовать
          </button>
        </div>
        {anonToast ? (
          <p className="anon-toast" role="status">
            {anonToast}
          </p>
        ) : null}
      </div>
      <ImageCropModal
        open={cropOpen}
        imageSrc={cropSrc}
        variant="post"
        fileName={cropName || "photo.jpg"}
        onClose={cancelCropQueue}
        onComplete={(f) => void onCropModalComplete(f)}
      />
    </div>
  );
}
