"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { DORMS } from "@/lib/constants";
import { toDateTimeLocalValue } from "@/lib/events";

type EventItem = {
  id: string;
  title: string;
  dateText: string;
  startsAt: string | null;
  place: string;
  color: string;
  dormLabel: string;
};

export function EventsPageClient() {
  const { data: session } = useSession();
  const canManageEvents = Boolean(session?.user?.isOwner);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(new Date()));
  const [place, setPlace] = useState("");
  const [dormSlug, setDormSlug] = useState<"all" | "1" | "2" | "3">("all");
  const [err, setErr] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<EventItem[]> => {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("events");
      return res.json();
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startsAt: new Date(startsAt).toISOString(),
          place,
          dormSlug,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Не удалось добавить событие",
        );
      }
    },
    onSuccess: () => {
      setTitle("");
      setPlace("");
      setErr("");
      void qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Не удалось удалить");
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <div className="events-page">
      <div className="events-page-head">
        <div>
          <h1 className="events-h1">События</h1>
          <p className="events-sub">
            Отдельная страница для расписания: задавай точные дату и время.
          </p>
        </div>
        <Link className="events-back" href="/feed">
          К ленте
        </Link>
      </div>

      <div className="events-grid">
        <section className="events-panel">
          <h2 className="events-h2">Добавить событие</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErr("");
              addMut.mutate();
            }}
          >
            <label className="events-lbl2" htmlFor="evp-title">
              Название
            </label>
            <input
              id="evp-title"
              className="events-inp2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Кино-вечер, собрание старост..."
              maxLength={120}
            />

            <label className="events-lbl2" htmlFor="evp-dt">
              Точная дата и время
            </label>
            <input
              id="evp-dt"
              className="events-inp2"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />

            <div className="events-quick">
              <button
                type="button"
                className="events-quick-btn"
                onClick={() => setStartsAt(toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)))}
              >
                Через 1 час
              </button>
              <button
                type="button"
                className="events-quick-btn"
                onClick={() => {
                  const d = new Date();
                  d.setHours(20, 0, 0, 0);
                  setStartsAt(toDateTimeLocalValue(d));
                }}
              >
                Сегодня 20:00
              </button>
            </div>

            <label className="events-lbl2" htmlFor="evp-place">
              Место (опционально)
            </label>
            <input
              id="evp-place"
              className="events-inp2"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Холл, актовый зал, этаж 4..."
              maxLength={100}
            />

            <label className="events-lbl2" htmlFor="evp-dorm">
              Общага
            </label>
            <select
              id="evp-dorm"
              className="events-sel2"
              value={dormSlug}
              onChange={(e) => setDormSlug(e.target.value as "all" | "1" | "2" | "3")}
            >
              <option value="all">Все общаги</option>
              <option value="1">{DORMS["1"].name}</option>
              <option value="2">{DORMS["2"].name}</option>
              <option value="3">{DORMS["3"].name}</option>
            </select>

            {err ? <div className="events-err2">{err}</div> : null}

            <button
              className="events-submit2"
              type="submit"
              disabled={addMut.isPending || !title.trim() || !startsAt}
            >
              {addMut.isPending ? "Сохраняю..." : "Добавить событие"}
            </button>
          </form>
        </section>

        <section className="events-list-wrap">
          <h2 className="events-h2">Ближайшие события</h2>
          {isLoading ? (
            <div className="events-empty2">Загрузка...</div>
          ) : events.length === 0 ? (
            <div className="events-empty2">Событий пока нет</div>
          ) : (
            <div className="events-list2">
              {events.map((ev) => (
                <article key={ev.id} className="events-row2">
                  <div className="events-row-main">
                    <div className="events-title2">{ev.title}</div>
                    <div className="events-meta2">
                      <span className="ev-dot" style={{ background: ev.color }} />
                      {ev.dateText} · {ev.dormLabel}
                      {ev.place ? ` · ${ev.place}` : ""}
                    </div>
                  </div>
                  {canManageEvents ? (
                    <button
                      type="button"
                      className="ev-del"
                      onClick={() => delMut.mutate(ev.id)}
                      disabled={delMut.isPending}
                      title="Удалить событие"
                    >
                      ×
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

