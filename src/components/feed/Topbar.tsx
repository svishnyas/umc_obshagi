"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useDebounced } from "@/hooks/useDebounced";
import { dormBg, dormColor, ini } from "@/lib/utils";
import { NotifPanel } from "./NotifPanel";
import { useUiStore, type DormFilter } from "@/store/ui";
import { useEffect, useState } from "react";

type Counts = {
  all: number;
  bySlug: Record<string, number>;
};

export function Topbar({
  counts,
  onOpenProfile,
  onToggleMobileNav,
  onToggleMobileExtra,
}: {
  counts: Counts | undefined;
  onOpenProfile: () => void;
  onToggleMobileNav?: () => void;
  onToggleMobileExtra?: () => void;
}) {
  const { data: session } = useSession();
  const dorm = useUiStore((s) => s.dorm);
  const setDorm = useUiStore((s) => s.setDorm);
  const setSearch = useUiStore((s) => s.setSearch);

  const [localSearch, setLocalSearch] = useState("");
  const debounced = useDebounced(localSearch, 300);

  useEffect(() => {
    setSearch(debounced.trim());
  }, [debounced, setSearch]);

  const slug = session?.user?.dormSlug ?? "1";

  function tabClass(d: DormFilter): string {
    if (dorm !== d) return "tb-tab";
    if (d === "all") return "tb-tab a0";
    return `tb-tab a${d}`;
  }

  return (
    <div className="topbar">
      <button
        type="button"
        className="tb-drawer-btn tb-drawer-btn--menu"
        aria-label="Меню: общежития и темы"
        onClick={() => onToggleMobileNav?.()}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
          <path
            fill="currentColor"
            d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"
          />
        </svg>
      </button>
      <div className="tb-brand">
        <span className="tb-umc" aria-hidden>
          УМЦ
        </span>
        <span className="tb-name">общаги</span>
      </div>
      <div className="tb-sep tb-sep--nav" />
      <div className="tb-nav">
        <button
          type="button"
          className={tabClass("all")}
          id="tt-all"
          onClick={() => setDorm("all")}
        >
          <div className="tab-dot" style={{ background: "#1ECC8A" }} />
          Все
          <span className="tab-cnt" id="tcnt-all">
            {counts?.all ?? 0}
          </span>
        </button>
        <button
          type="button"
          className={tabClass("1")}
          id="tt-1"
          onClick={() => setDorm("1")}
        >
          <div className="tab-dot" style={{ background: "#4B9EFF" }} />
          Волхонка
          <span className="tab-cnt" id="tcnt-1">
            {counts?.bySlug?.["1"] ?? 0}
          </span>
        </button>
        <button
          type="button"
          className={tabClass("2")}
          id="tt-2"
          onClick={() => setDorm("2")}
        >
          <div className="tab-dot" style={{ background: "#FF6BAE" }} />
          Даниловская
          <span className="tab-cnt" id="tcnt-2">
            {counts?.bySlug?.["2"] ?? 0}
          </span>
        </button>
        <button
          type="button"
          className={tabClass("3")}
          id="tt-3"
          onClick={() => setDorm("3")}
        >
          <div className="tab-dot" style={{ background: "#FFB347" }} />
          Беговая
          <span className="tab-cnt" id="tcnt-3">
            {counts?.bySlug?.["3"] ?? 0}
          </span>
        </button>
      </div>
      <div className="tb-right">
        <Link href="/squads" className="tb-squads-cta" title="Сквады комнат — общая страница">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
          </svg>
          Комнаты
        </Link>
        <button
          type="button"
          className="tb-drawer-btn tb-drawer-btn--extra"
          aria-label="События и правила"
          onClick={() => onToggleMobileExtra?.()}
        >
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden>
            <rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 2v4M16 2v4M3 10h18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </button>
        <div className="search-btn">
          <svg viewBox="0 0 16 16" aria-hidden>
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            id="search-inp"
            placeholder="Поиск по постам..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <div className="notif-wrap">
          <NotifPanel />
        </div>
        <button type="button" className="profile-btn" onClick={onOpenProfile}>
          <div className="post-av" id="tb-av" style={{ width: 26, height: 26, fontSize: 10 }}>
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={26}
                height={26}
                unoptimized
              />
            ) : (
              <span style={{ color: dormColor(slug), background: dormBg(slug) }}>
                {ini(session?.user?.name ?? "?")}
              </span>
            )}
          </div>
          <span className="profile-btn-name" id="tb-name">
            {session?.user?.name}
          </span>
        </button>
      </div>
    </div>
  );
}
