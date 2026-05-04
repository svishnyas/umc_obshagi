"use client";

import { useCallback, useEffect, useState } from "react";
import { useUiStore, type DormFilter } from "@/store/ui";
import { GtaDormTransition } from "./GtaDormTransition";

type DormSlug = "1" | "2" | "3";

const GTA_ZASTAVKA_KEY = "umc_sidebar_gta_zastavka";

export function Sidebar({
  trending,
  className,
  onAfterNavigate,
}: {
  trending: { rank: number; tag: string; label: string; score: number }[];
  className?: string;
  onAfterNavigate?: () => void;
}) {
  const dorm = useUiStore((s) => s.dorm);
  const setDorm = useUiStore((s) => s.setDorm);
  const [gtaSlug, setGtaSlug] = useState<DormSlug | null>(null);
  /** Выкл по умолчанию — заставка не мешает каждый раз; вкл вручную рядом с «Общежития» */
  const [gtaZastavkaOn, setGtaZastavkaOn] = useState(false);

  useEffect(() => {
    try {
      setGtaZastavkaOn(localStorage.getItem(GTA_ZASTAVKA_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function persistGtaZastavka(on: boolean) {
    setGtaZastavkaOn(on);
    try {
      localStorage.setItem(GTA_ZASTAVKA_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function pickDorm(d: DormFilter) {
    onAfterNavigate?.();
    if (d === dorm) return;
    if (d === "all") {
      setDorm("all");
      return;
    }
    if (gtaZastavkaOn) setGtaSlug(d);
    else setDorm(d);
  }

  const onGtaFinished = useCallback(() => {
    setGtaSlug((current) => {
      if (current) setDorm(current);
      return null;
    });
  }, [setDorm]);

  function cardSel(d: DormFilter): string {
    return dorm === d ? "dorm-card sel" : "dorm-card";
  }

  return (
    <aside
      className={["sidebar", className].filter(Boolean).join(" ")}
      aria-label="Общежития и темы"
    >
      {gtaSlug ? <GtaDormTransition targetSlug={gtaSlug} onFinished={onGtaFinished} /> : null}
      <div className="sidebar-section">
        <div className="sidebar-head-row">
          <div className="sidebar-head">Общежития</div>
          <label
            className="sidebar-gta-sw"
            title="Если включено — при выборе общаги показывается заставка со слайдами и звуком (~15 с). Выключено — сразу переключение."
          >
            <input
              type="checkbox"
              role="switch"
              aria-checked={gtaZastavkaOn}
              aria-label="Заставка при смене общаги"
              checked={gtaZastavkaOn}
              onChange={(e) => persistGtaZastavka(e.target.checked)}
            />
            <span className="sidebar-gta-sw-track" aria-hidden />
            <span className="sidebar-gta-sw-cap">ГТА</span>
          </label>
        </div>
        <div
          className={cardSel("all")}
          id="sc-all"
          style={{
            background: "#1ECC8A12",
            ...(dorm === "all"
              ? { borderColor: "var(--border2)" }
              : {}),
          }}
          onClick={() => pickDorm("all")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pickDorm("all");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="dc-top">
            <div className="dc-dot" style={{ background: "#1ECC8A" }} />
            <span className="dc-name" style={{ color: "#1ECC8A" }}>
              Все посты
            </span>
          </div>
          <div className="dc-sub">Вся лента</div>
        </div>
        <div
          className={cardSel("1")}
          id="sc-1"
          style={{ background: "#4B9EFF12" }}
          onClick={() => pickDorm("1")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") pickDorm("1");
          }}
        >
          <div className="dc-top">
            <div className="dc-dot" style={{ background: "#4B9EFF" }} />
            <span className="dc-name" style={{ color: "#4B9EFF" }}>
              Волхонка
            </span>
          </div>
          <div className="dc-sub">Мужская общага</div>
        </div>
        <div
          className={cardSel("2")}
          id="sc-2"
          style={{ background: "#FF6BAE12" }}
          onClick={() => pickDorm("2")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") pickDorm("2");
          }}
        >
          <div className="dc-top">
            <div className="dc-dot" style={{ background: "#FF6BAE" }} />
            <span className="dc-name" style={{ color: "#FF6BAE" }}>
              Даниловская
            </span>
          </div>
          <div className="dc-sub">Женская общага</div>
        </div>
        <div
          className={cardSel("3")}
          id="sc-3"
          style={{ background: "#FFB34712" }}
          onClick={() => pickDorm("3")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") pickDorm("3");
          }}
        >
          <div className="dc-top">
            <div className="dc-dot" style={{ background: "#FFB347" }} />
            <span className="dc-name" style={{ color: "#FFB347" }}>
              Беговая
            </span>
          </div>
          <div className="dc-sub">Мужская общага</div>
        </div>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-section" style={{ paddingBottom: 20 }}>
        <div className="sidebar-head">Популярные темы</div>
        <div id="trending-list">
          {trending.map((t) => (
            <div key={t.tag} className="trend-item">
              <span className="trend-num">{t.rank}</span>
              <span className="trend-text">{t.label}</span>
              <span className="trend-cnt">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
