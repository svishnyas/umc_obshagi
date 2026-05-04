"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export function NotifPanel() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 20_000,
  });

  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    void fetch("/api/notifications", { method: "PATCH" }).then(() => {
      void refetch();
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [open, refetch, qc]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        panelRef.current?.contains(t) ||
        btnRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const items = data?.notifications ?? [];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="notif-btn"
        id="notif-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        <svg viewBox="0 0 16 16" aria-hidden>
          <path d="M8 2a4.5 4.5 0 00-4.5 4.5v2.5L2 11h12l-1.5-2V6.5A4.5 4.5 0 008 2zM6.5 13a1.5 1.5 0 003 0" />
        </svg>
        <div
          className="notif-badge"
          id="notif-badge"
          style={{ display: unread ? "block" : "none" }}
        />
      </button>
      <div
        ref={panelRef}
        className={`notif-panel ${open ? "show" : ""}`}
        id="notif-panel"
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          left: "auto",
        }}
      >
        <div className="notif-head">Уведомления</div>
        <div id="notif-list">
          {items.length === 0 ? (
            <div className="notif-empty">Нет уведомлений</div>
          ) : (
            items.map(
              (n: {
                id: string;
                text: string;
                timeLabel: string;
                read: boolean;
              }) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? "" : "unread"}`}
                >
                  <div className="ni-text">{n.text}</div>
                  <div className="ni-time">{n.timeLabel}</div>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </>
  );
}
