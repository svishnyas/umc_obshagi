"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ROOM_SQUAD_MAX_MEMBERS } from "@/lib/room-squad";

type SquadRow = {
  id: string;
  roomLabel: string;
  title: string;
  bannerColor: string;
  bannerImageUrl: string | null;
  avatarUrl: string | null;
  memberCount: number;
  isMember: boolean;
  myRole: string | null;
  createdAt: string;
};

function roomMonogramList(label: string): string {
  const t = label.replace(/\s+/g, "").slice(0, 4);
  return t || "?";
}

function ruParticipants(n: number): string {
  const m = n % 100;
  const d = m % 10;
  if (m >= 11 && m <= 14) return `${n} участников`;
  if (d === 1) return `${n} участник`;
  if (d >= 2 && d <= 4) return `${n} участника`;
  return `${n} участников`;
}

export default function SquadsListPage() {
  const { status } = useSession();
  const qc = useQueryClient();
  const [roomLabel, setRoomLabel] = useState("");
  const [title, setTitle] = useState("");
  const [formErr, setFormErr] = useState("");

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ["squads"],
    enabled: status === "authenticated",
    queryFn: async (): Promise<SquadRow[]> => {
      const res = await fetch("/api/squads");
      if (!res.ok) throw new Error("squads");
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomLabel, title }),
      });
      let data: Record<string, unknown> = {};
      try {
        const ct = res.headers.get("content-type");
        if (ct?.includes("application/json")) {
          data = (await res.json()) as Record<string, unknown>;
        }
      } catch {
        data = {};
      }
      if (!res.ok) {
        const errMsg =
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
              ? data.message
              : null;
        const text =
          errMsg ??
          (res.status === 401
            ? "Нужна авторизация"
            : res.status === 429
              ? "Слишком много запросов, попробуй позже"
              : res.status === 503
                ? "Сервис временно недоступен (часто это несинхронная база — см. текст от сервера выше)."
                : res.status >= 500
                  ? "Сервер вернул ошибку. Если только что добавляли сквады — выполни npx prisma db push и перезапусти dev."
                  : "Не удалось создать сквад");
        throw new Error(text);
      }
      return data as SquadRow;
    },
    onSuccess: () => {
      setRoomLabel("");
      setTitle("");
      setFormErr("");
      void qc.invalidateQueries({ queryKey: ["squads"] });
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  const joinMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/squads/${id}/join`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Ошибка");
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["squads"] }),
  });

  return (
    <div className="squads-stack">
      <div className="squads-hero">
        <p className="squads-lead">
          Комнаты как <strong>мини-группы</strong>: обложка и аватар сквада,
          переписка с другими комнатами и своя стена. Участников не больше{" "}
          {ROOM_SQUAD_MAX_MEMBERS}.
        </p>
      </div>

      <section className="squads-card">
        <h2 className="squads-h2">Создать сквад</h2>
        <div className="squads-form-grid">
          <label className="squads-field">
            <span>Номер комнаты</span>
            <input
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
              placeholder="312"
              maxLength={12}
              className="squads-inp"
            />
          </label>
          <label className="squads-field squads-field-full">
            <span>Заголовок / слоган</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Ночная смена"
              maxLength={80}
              className="squads-inp"
            />
          </label>
        </div>
        {formErr ? <p className="squads-err">{formErr}</p> : null}
        <button
          type="button"
          className="squads-btn"
          disabled={createMut.isPending || !roomLabel.trim()}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? "Создаём…" : "Создать и вступить"}
        </button>
      </section>

      <section className="squads-groups-section">
        <h2 className="squads-h2 squads-h2--inline">Комнаты в общаге</h2>
        {isLoading ? (
          <p className="squads-muted">Загрузка…</p>
        ) : squads.length === 0 ? (
          <p className="squads-muted">Пока нет сквадов — создай первый.</p>
        ) : (
          <ul className="squads-group-list">
            {squads.map((s) => (
              <li key={s.id} className="squads-group-card">
                <Link href={`/squads/${s.id}`} className="squads-group-card__link">
                  <div
                    className="squads-group-card__cover"
                    style={
                      s.bannerImageUrl
                        ? {
                            backgroundImage: `url(${s.bannerImageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundColor: s.bannerColor,
                          }
                        : {
                            background: `linear-gradient(165deg, ${s.bannerColor} 0%, #121417 92%)`,
                          }
                    }
                  >
                    <span className="squads-group-card__cover-fade" aria-hidden />
                  </div>
                  <div className="squads-group-card__panel">
                    <div
                      className="squads-group-card__avatar"
                      style={{
                        borderColor: s.bannerColor,
                        boxShadow: `0 0 0 3px var(--bg), 0 8px 24px rgba(0,0,0,.35)`,
                      }}
                    >
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatarUrl}
                          alt=""
                          className="squads-group-card__avatar-img"
                        />
                      ) : (
                        <span className="squads-group-card__avatar-inner">
                          {roomMonogramList(s.roomLabel)}
                        </span>
                      )}
                    </div>
                    <div className="squads-group-card__text">
                      <div className="squads-group-card__name">
                        Комната {s.roomLabel}
                        {s.isMember ? (
                          <span className="squads-group-card__badge">ты внутри</span>
                        ) : null}
                      </div>
                      {s.title ? (
                        <div className="squads-group-card__tagline">{s.title}</div>
                      ) : (
                        <div className="squads-group-card__tagline squads-group-card__tagline--muted">
                          Загляни в ленту комнаты
                        </div>
                      )}
                      <div className="squads-group-card__meta">
                        {ruParticipants(s.memberCount)}
                      </div>
                    </div>
                  </div>
                </Link>
                {!s.isMember ? (
                  <div className="squads-group-card__actions">
                    <button
                      type="button"
                      className="squads-btn squads-btn-small squads-btn-outline"
                      disabled={
                        joinMut.isPending ||
                        s.memberCount >= ROOM_SQUAD_MAX_MEMBERS
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        joinMut.mutate(s.id);
                      }}
                    >
                      {s.memberCount >= ROOM_SQUAD_MAX_MEMBERS
                        ? "Полон"
                        : "Вступить"}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
