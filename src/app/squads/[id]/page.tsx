"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { RichRoomText } from "@/components/ui/RichRoomText";
import { previewRoomMentionParts } from "@/lib/room-mentions";
import { PostCard } from "@/components/feed/PostCard";
import { Lightbox } from "@/components/feed/Lightbox";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { TAGS } from "@/lib/constants";
import type { FeedPost } from "@/lib/types";
import { ROOM_SQUAD_MAX_MEMBERS } from "@/lib/room-squad";
import { ini } from "@/lib/utils";

function membersWordRu(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "участников";
  if (m10 === 1) return "участник";
  if (m10 >= 2 && m10 <= 4) return "участника";
  return "участников";
}

function roomMonogram(roomLabel: string): string {
  const t = roomLabel.replace(/\s+/g, "").slice(0, 4);
  return t || "?";
}

function formatSquadSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type SquadDetail = {
  id: string;
  dormSlug: string;
  dormName: string;
  roomLabel: string;
  title: string;
  bannerColor: string;
  bannerImageUrl: string | null;
  avatarUrl: string | null;
  memberCount: number;
  isMember: boolean;
  isLeader: boolean;
  members: {
    userId: string;
    nickname: string;
    room: string | null;
    avatarUrl: string | null;
    role: string;
    joinedAt: string;
  }[];
  createdAt: string;
};

export default function SquadDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { status } = useSession();
  const qc = useQueryClient();
  const [lbSrc, setLbSrc] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [banTitle, setBanTitle] = useState("");
  const [banColor, setBanColor] = useState("#1ECC8A");
  const [banAvatar, setBanAvatar] = useState<string | null>(null);
  const [banImg, setBanImg] = useState<string | null>(null);
  /** Локальный превью blob до ответа сервера */
  const [localBannerUrl, setLocalBannerUrl] = useState<string | null>(null);
  const [banBusy, setBanBusy] = useState(false);
  const [banErr, setBanErr] = useState("");
  const bannerBlobRef = useRef<string | null>(null);

  const [postText, setPostText] = useState("");
  const [postTag, setPostTag] = useState("g");
  const [postBusy, setPostBusy] = useState(false);
  const [postErr, setPostErr] = useState("");

  const [mateAvBusy, setMateAvBusy] = useState(false);
  const [mateAvErr, setMateAvErr] = useState("");

  const cropCbRef = useRef<(f: File) => void>(() => {});
  const [cropUi, setCropUi] = useState<{
    open: boolean;
    src: string | null;
    name: string;
    variant: "avatar" | "banner";
  }>({ open: false, src: null, name: "", variant: "avatar" });

  function openImageCrop(
    file: File,
    variant: "avatar" | "banner",
    then: (f: File) => void,
  ) {
    cropCbRef.current = then;
    setCropUi((prev) => {
      if (prev.src) URL.revokeObjectURL(prev.src);
      return {
        open: true,
        src: URL.createObjectURL(file),
        name: file.name,
        variant,
      };
    });
  }

  function closeImageCrop() {
    setCropUi((prev) => {
      if (prev.src) URL.revokeObjectURL(prev.src);
      return { open: false, src: null, name: "", variant: "avatar" };
    });
  }

  function onImageCropDone(file: File) {
    cropCbRef.current(file);
    closeImageCrop();
  }

  const { data: dormSquadsForPreview = [] } = useQuery({
    queryKey: ["squads"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/squads");
      if (!res.ok) return [];
      return (await res.json()) as { id: string; roomLabel: string }[];
    },
  });

  const squadWallMentionPreview = useMemo(
    () => previewRoomMentionParts(postText, dormSquadsForPreview),
    [postText, dormSquadsForPreview],
  );

  const { data: squad, error: squadErr } = useQuery({
    queryKey: ["squad", id],
    enabled: status === "authenticated" && Boolean(id),
    queryFn: async (): Promise<SquadDetail> => {
      const res = await fetch(`/api/squads/${id}`);
      if (res.status === 404) throw new Error("404");
      if (!res.ok) throw new Error("squad");
      return res.json();
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["squad-posts", id],
    enabled: status === "authenticated" && Boolean(id) && Boolean(squad),
    queryFn: async (): Promise<FeedPost[]> => {
      const res = await fetch(`/api/squads/${id}/posts`);
      if (!res.ok) throw new Error("posts");
      return res.json();
    },
  });

  const revokeBannerBlob = useCallback(() => {
    if (bannerBlobRef.current) {
      URL.revokeObjectURL(bannerBlobRef.current);
      bannerBlobRef.current = null;
    }
    setLocalBannerUrl(null);
  }, []);

  const syncBannerFormFromSquad = useCallback(() => {
    if (!squad) return;
    revokeBannerBlob();
    setBanTitle(squad.title);
    setBanColor(squad.bannerColor);
    setBanAvatar(squad.avatarUrl);
    setBanImg(squad.bannerImageUrl);
    setBanErr("");
  }, [squad, revokeBannerBlob]);

  useEffect(() => {
    return () => revokeBannerBlob();
  }, [revokeBannerBlob]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLbSrc(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const joinMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/squads/${id}/join`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Ошибка");
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["squad", id] });
      void qc.invalidateQueries({ queryKey: ["squads"] });
      void qc.invalidateQueries({ queryKey: ["squad-posts", id] });
    },
  });

  const leaveMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/squads/${id}/leave`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Ошибка");
      }
      return data as { disbanded?: boolean };
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["squads"] });
      if (data?.disbanded) router.push("/squads");
      else void qc.invalidateQueries({ queryKey: ["squad", id] });
    },
  });

  async function saveBanner() {
    setBanBusy(true);
    setBanErr("");
    try {
      const res = await fetch(`/api/squads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: banTitle.trim(),
          bannerColor: banColor,
          bannerImageUrl: banImg,
          avatarUrl: banAvatar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanErr(typeof data.error === "string" ? data.error : "Ошибка");
        return;
      }
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["squad", id] });
      void qc.invalidateQueries({ queryKey: ["squads"] });
    } finally {
      setBanBusy(false);
    }
  }

  async function uploadBannerImage(f: File) {
    revokeBannerBlob();
    const blob = URL.createObjectURL(f);
    bannerBlobRef.current = blob;
    setLocalBannerUrl(blob);

    setBanBusy(true);
    setBanErr("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("purpose", "squad_banner");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanErr(
          typeof data.error === "string" ? data.error : "Загрузка не удалась",
        );
        return;
      }
      if (data.url) {
        revokeBannerBlob();
        setBanImg(data.url);
      }
    } finally {
      setBanBusy(false);
    }
  }

  async function uploadSquadAvatar(f: File) {
    setBanBusy(true);
    setBanErr("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("purpose", "squad_avatar");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanErr(
          typeof data.error === "string" ? data.error : "Загрузка не удалась",
        );
        return;
      }
      if (data.url) setBanAvatar(data.url);
    } finally {
      setBanBusy(false);
    }
  }

  async function uploadMemberAsideAvatar(f: File) {
    setMateAvBusy(true);
    setMateAvErr("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("purpose", "squad_avatar");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        setMateAvErr(
          typeof upData.error === "string" ? upData.error : "Загрузка не удалась",
        );
        return;
      }
      if (!upData.url) return;
      const res = await fetch(`/api/squads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: upData.url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMateAvErr(typeof data.error === "string" ? data.error : "Ошибка");
        return;
      }
      void qc.invalidateQueries({ queryKey: ["squad", id] });
      void qc.invalidateQueries({ queryKey: ["squads"] });
    } finally {
      setMateAvBusy(false);
    }
  }

  async function submitPost() {
    const t = postText.trim();
    if (!t) return;
    setPostBusy(true);
    setPostErr("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t,
          tag: postTag,
          photoUrls: [],
          isAnonymous: false,
          squadId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostErr(typeof data.error === "string" ? data.error : "Ошибка");
        return;
      }
      setPostText("");
      void qc.invalidateQueries({ queryKey: ["squad-posts", id] });
      void qc.invalidateQueries({ queryKey: ["squads"] });
    } finally {
      setPostBusy(false);
    }
  }

  if (squadErr && squadErr.message === "404") {
    return (
      <div className="squads-stack">
        <p className="squads-err">Сквад не найден или в другой общаге.</p>
        <Link href="/squads" className="squads-top-link">
          К списку
        </Link>
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="squads-stack">
        <p className="squads-muted">Загрузка…</p>
      </div>
    );
  }

  const invKeys: string[][] = [["squad-posts", id], ["squads"]];

  const studioBannerUrl = banImg || localBannerUrl;
  const studioAvatarUrl = banAvatar ?? squad.avatarUrl;
  const coverStyle = (opts: {
    color: string;
    imageUrl: string | null;
  }): CSSProperties => ({
    backgroundColor: opts.color,
    backgroundImage: opts.imageUrl
      ? `linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.62) 100%), url(${opts.imageUrl})`
      : `linear-gradient(180deg, rgba(255,255,255,.06) 0%, rgba(0,0,0,.18) 100%)`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  });

  return (
    <>
      <div className="squads-stack squad-page">
        <div className="squads-back squad-page-back">
          <Link href="/squads">← Все сквады</Link>
        </div>

        <div className="squad-layout">
          <div className="squad-layout-main">
            <div className="squad-vk">
              <div
                className="squad-vk-cover"
                style={coverStyle({
                  color: squad.bannerColor,
                  imageUrl: squad.bannerImageUrl,
                })}
                aria-hidden
              />
              <div className="squad-vk-panel">
                <div className="squad-vk-top">
                  <div className="squad-vk-avatar-wrap">
                    <div className="squad-vk-avatar" aria-hidden>
                      {squad.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={squad.avatarUrl}
                          alt=""
                          className="squad-vk-avatar-img"
                        />
                      ) : (
                        <span className="squad-vk-avatar-mono">
                          {roomMonogram(squad.roomLabel)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="squad-vk-head">
                    <h1 className="squad-vk-title">
                      Комната {squad.roomLabel}
                    </h1>
                    {squad.isMember ? (
                      <p className="squad-vk-status">Ты в скваде</p>
                    ) : null}
                    {squad.title ? (
                      <p className="squad-vk-sub">{squad.title}</p>
                    ) : (
                      <p className="squad-vk-sub squad-vk-sub--muted">
                        Сквад общежития
                      </p>
                    )}
                    <p className="squad-vk-meta">
                      <span className="squad-vk-meta-chip squad-vk-meta-dorm">
                        {squad.dormName}
                      </span>
                      <span className="squad-vk-meta-chip">
                        {squad.memberCount} {membersWordRu(squad.memberCount)}
                      </span>
                      <span className="squad-vk-meta-chip">
                        лимит {ROOM_SQUAD_MAX_MEMBERS}
                      </span>
                    </p>
                  </div>
                  {(!squad.isMember || squad.isLeader) ? (
                    <div className="squad-vk-actions">
                      {!squad.isMember ? (
                        <button
                          type="button"
                          className="squads-btn squad-vk-btn-main"
                          disabled={
                            joinMut.isPending ||
                            squad.memberCount >= ROOM_SQUAD_MAX_MEMBERS
                          }
                          onClick={() => joinMut.mutate()}
                        >
                          {squad.memberCount >= ROOM_SQUAD_MAX_MEMBERS
                            ? "Полон"
                            : "Вступить"}
                        </button>
                      ) : null}
                      {squad.isLeader ? (
                        <button
                          type="button"
                          className="squads-btn squads-btn-small squads-btn-outline squad-vk-btn-more"
                          onClick={() => {
                            if (editOpen) {
                              setEditOpen(false);
                            } else {
                              syncBannerFormFromSquad();
                              setEditOpen(true);
                            }
                          }}
                        >
                          {editOpen ? "Готово" : "Настроить"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <nav
                  className="squad-vk-tabs squad-vk-tabs--line"
                  aria-label="Разделы страницы"
                >
                  <a className="squad-vk-tab-line" href="#squad-wall">
                    Стена
                  </a>
                  <a className="squad-vk-tab-line" href="#squad-roster">
                    Участники
                  </a>
                </nav>
              </div>
            </div>

        {editOpen && squad.isLeader ? (
          <section className="squad-studio squads-card" aria-label="Настройка">
            <div className="squad-studio-head">
              <h2 className="squad-studio-title">Как будет выглядеть шапка</h2>
              <p className="squad-studio-lead">
                Широкий баннер и аватар комнаты. Превью обновляется после
                выбора файла — сохрани, чтобы закрепить.
              </p>
            </div>
            <div className="squad-studio-body">
              <div className="squad-studio-preview">
                <div
                  className="squad-studio-preview-cover"
                  style={coverStyle({
                    color: banColor,
                    imageUrl: studioBannerUrl,
                  })}
                />
                <div className="squad-studio-preview-bar">
                  <div className="squad-vk-avatar squad-vk-avatar--sm">
                    {studioAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={studioAvatarUrl}
                        alt=""
                        className="squad-vk-avatar-img"
                      />
                    ) : (
                      <span className="squad-vk-avatar-mono">
                        {roomMonogram(squad.roomLabel)}
                      </span>
                    )}
                  </div>
                  <div className="squad-studio-preview-text">
                    <span className="squad-studio-preview-name">
                      Комната {squad.roomLabel}
                    </span>
                    <span className="squad-studio-preview-tag">
                      {banTitle.trim() || "Подпись к комнате"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="squad-studio-form">
                <label className="squads-field">
                  <span>Подпись под названием</span>
                  <input
                    className="squads-inp"
                    value={banTitle}
                    onChange={(e) => setBanTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Например: тихий этаж · настолки по четвергам"
                  />
                </label>
                <div className="squads-field squads-field-full">
                  <span>Аватар комнаты (круг в шапке)</span>
                  <label
                    className="squad-avatar-drop"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (
                        f &&
                        /^image\/(jpeg|png|webp|gif)/i.test(f.type || "")
                      ) {
                        openImageCrop(f, "avatar", uploadSquadAvatar);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="squad-avatar-drop-input"
                      disabled={banBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) openImageCrop(f, "avatar", uploadSquadAvatar);
                      }}
                    />
                    <span className="squad-avatar-drop-hint">
                      Нажми или перетащи сюда изображение — превью обновится в
                      блоке выше, затем нажми «Сохранить шапку».
                    </span>
                  </label>
                  {banAvatar || squad.avatarUrl ? (
                    <button
                      type="button"
                      className="squads-text-btn"
                      disabled={banBusy}
                      onClick={() => setBanAvatar(null)}
                    >
                      Убрать аватар
                    </button>
                  ) : null}
                </div>
                <label className="squads-field">
                  <span>Фон баннера, если нет фото</span>
                  <input
                    type="color"
                    className="squads-color"
                    value={banColor}
                    onChange={(e) => setBanColor(e.target.value)}
                  />
                </label>
                <div className="squads-field squads-field-full">
                  <span>Обложка (JPEG, PNG, WebP, GIF)</span>
                  <label
                    className="squad-banner-upload"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (
                        f &&
                        /^image\/(jpeg|png|webp|gif)/i.test(f.type || "")
                      ) {
                        openImageCrop(f, "banner", uploadBannerImage);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="squad-banner-upload-input"
                      disabled={banBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) openImageCrop(f, "banner", uploadBannerImage);
                      }}
                    />
                    {studioBannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={studioBannerUrl}
                        alt=""
                        className="squad-banner-upload-preview"
                      />
                    ) : (
                      <span className="squad-banner-upload-placeholder">
                        Нажми или перетащи файл — превью появится здесь
                      </span>
                    )}
                  </label>
                  {studioBannerUrl ? (
                    <button
                      type="button"
                      className="squad-banner-remove"
                      disabled={banBusy}
                      onClick={() => {
                        revokeBannerBlob();
                        setBanImg(null);
                      }}
                    >
                      Убрать обложку
                    </button>
                  ) : null}
                </div>
                {banErr ? <p className="squads-err">{banErr}</p> : null}
                <button
                  type="button"
                  className="squads-btn squad-studio-save"
                  disabled={banBusy}
                  onClick={() => void saveBanner()}
                >
                  {banBusy ? "Сохраняем…" : "Сохранить шапку"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {squad.isMember ? (
          <section
            className="squads-card squad-compose-card squad-compose--vk"
            id="squad-compose"
          >
            <div className="squad-compose-kickoff">
              <span className="squad-compose-plus" aria-hidden>
                +
              </span>
              <div>
                <h2 className="squad-compose-title">Новая запись</h2>
                <p className="squad-compose-hint">
                  Видна только на стене этого сквада. В общую ленту от имени
                  комнаты пиши с главной страницы.
                </p>
              </div>
            </div>
            <div className="squad-compose-tags">
              {(["g", "q", "e", "l"] as const).map((tg) => (
                <button
                  key={tg}
                  type="button"
                  className={
                    postTag === tg ? "squad-tag squad-tag-on" : "squad-tag"
                  }
                  onClick={() => setPostTag(tg)}
                >
                  {TAGS[tg]?.label ?? tg}
                </button>
              ))}
            </div>
            <textarea
              className="squads-ta"
              rows={4}
              placeholder="Напиши что-нибудь для стены сквада…"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />
            {squad && /@/.test(postText) ? (
              <div style={{ marginTop: 8 }}>
                <p className="squads-muted" style={{ fontSize: 11, marginBottom: 4 }}>
                  Упоминания (@301)
                </p>
                <div className="compose-mention-preview">
                  <RichRoomText
                    parts={squadWallMentionPreview}
                    dormSlug={squad.dormSlug}
                  />
                </div>
              </div>
            ) : null}
            {postErr ? <p className="squads-err">{postErr}</p> : null}
            <button
              type="button"
              className="squads-btn"
              disabled={postBusy || !postText.trim()}
              onClick={() => void submitPost()}
            >
              {postBusy ? "Публикуем…" : "Опубликовать"}
            </button>
          </section>
        ) : (
          <p className="squads-muted squad-guest-hint">
            Вступи в сквад, чтобы писать на стене и отвечать в комментариях.
          </p>
        )}

        <section className="squads-card squad-wall-card" id="squad-wall">
          <div className="squad-wall-card-head">
            <h2 className="squads-h2 squad-wall-heading">Стена</h2>
          </div>
          <div id="posts-container" className="squads-posts">
            {posts.length === 0 ? (
              <p className="squads-muted squad-wall-empty">
                Пока нет записей.
              </p>
            ) : (
              posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onOpenPhoto={setLbSrc}
                  invalidateQueryKeys={invKeys}
                />
              ))
            )}
          </div>
        </section>
          </div>

          <aside className="squad-layout-aside" aria-label="О скваде">
            <div className="squad-aside-card squad-aside-card--info">
              <h3 className="squad-aside-h">
                <span className="squad-aside-i" aria-hidden>
                  i
                </span>
                Подробности
              </h3>
              <dl className="squad-aside-dl">
                <div className="squad-aside-row">
                  <dt>Общежитие</dt>
                  <dd>{squad.dormName}</dd>
                </div>
                <div className="squad-aside-row">
                  <dt>Комната</dt>
                  <dd>{squad.roomLabel}</dd>
                </div>
                <div className="squad-aside-row">
                  <dt>Создан</dt>
                  <dd>{formatSquadSince(squad.createdAt)}</dd>
                </div>
                <div className="squad-aside-row">
                  <dt>Участников</dt>
                  <dd>
                    {squad.memberCount} / {ROOM_SQUAD_MAX_MEMBERS}
                  </dd>
                </div>
              </dl>
              {squad.isMember ? (
                <div className="squad-aside-leave">
                  <button
                    type="button"
                    className="squad-leave-soft"
                    disabled={leaveMut.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Выйти из сквада? Если ты последний — сквад удалится.",
                        )
                      ) {
                        leaveMut.mutate();
                      }
                    }}
                  >
                    {leaveMut.isPending ? "…" : "Покинуть сквад"}
                  </button>
                </div>
              ) : null}
            </div>

            {squad.isMember && !squad.isLeader ? (
              <div className="squad-aside-card">
                <h3 className="squad-aside-h">Аватар комнаты</h3>
                <p className="squads-muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Виден в ленте при постах «от комнаты». Лидер может менять всё в
                  «Настроить».
                </p>
                <label
                  className="squad-avatar-drop"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files?.[0];
                    if (
                      f &&
                      /^image\/(jpeg|png|webp|gif)/i.test(f.type || "")
                    ) {
                      openImageCrop(f, "avatar", uploadMemberAsideAvatar);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="squad-avatar-drop-input"
                    disabled={mateAvBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) openImageCrop(f, "avatar", uploadMemberAsideAvatar);
                    }}
                  />
                  <span className="squad-avatar-drop-hint">
                    {mateAvBusy
                      ? "Загружаем…"
                      : "Нажми или выбери файл — сохранится сразу."}
                  </span>
                </label>
                {mateAvErr ? <p className="squads-err">{mateAvErr}</p> : null}
              </div>
            ) : null}

            <div className="squad-aside-card" id="squad-roster">
              <h3 className="squad-aside-h">Участники</h3>
              <p className="squad-aside-count">
                {squad.memberCount}{" "}
                {membersWordRu(squad.memberCount)}
              </p>
              <ul className="squad-subscribers-list">
                {squad.members.map((m) => (
                  <li key={m.userId} className="squad-subscribers-item">
                    <div className="squad-m-ava squad-m-ava--aside">
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="squad-m-ava-img"
                        />
                      ) : (
                        <span className="squad-m-ava-fallback">
                          {ini(m.nickname)}
                        </span>
                      )}
                    </div>
                    <div className="squad-subscribers-text">
                      <span className="squad-subscribers-name">
                        {m.nickname}
                      </span>
                      {m.room ? (
                        <span className="squad-subscribers-room">
                          комн. {m.room}
                        </span>
                      ) : null}
                      {m.role === "LEADER" ? (
                        <span className="squad-subscribers-lead">лидер</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
      <ImageCropModal
        open={cropUi.open}
        imageSrc={cropUi.src}
        variant={cropUi.variant === "banner" ? "banner" : "avatar"}
        fileName={cropUi.name || "photo.jpg"}
        onClose={closeImageCrop}
        onComplete={(f) => onImageCropDone(f)}
      />
      <Lightbox src={lbSrc} onClose={() => setLbSrc(null)} />
    </>
  );
}
