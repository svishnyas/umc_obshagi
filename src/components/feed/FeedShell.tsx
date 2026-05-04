"use client";

import { useSession } from "next-auth/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { FeedPost, PostsFeedPage } from "@/lib/types";
import { useUiStore } from "@/store/ui";
import { Compose } from "./Compose";
import { DormBanner } from "./DormBanner";
import { FeedTabs } from "./FeedTabs";
import { Lightbox } from "./Lightbox";
import { PostCard } from "./PostCard";
import { ProfilePanel } from "./ProfilePanel";
import { RightSidebar } from "./RightSidebar";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function FeedShell() {
  const { status } = useSession();
  const dorm = useUiStore((s) => s.dorm);
  const feedTab = useUiStore((s) => s.feedTab);
  const search = useUiStore((s) => s.search);

  const [lbSrc, setLbSrc] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileExtraOpen, setMobileExtraOpen] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetch("/api/overview").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const PAGE_SIZE = 30;

  const {
    data: postsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", dorm, feedTab, search],
    enabled: status === "authenticated",
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<PostsFeedPage> => {
      const u = new URL("/api/posts", window.location.origin);
      u.searchParams.set("dorm", dorm);
      u.searchParams.set("feed", feedTab);
      u.searchParams.set("page", String(pageParam));
      u.searchParams.set("pageSize", String(PAGE_SIZE));
      if (search) u.searchParams.set("q", search);
      const res = await fetch(u.toString());
      if (!res.ok) throw new Error("posts");
      return res.json() as Promise<PostsFeedPage>;
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    refetchInterval: 30_000,
  });

  const posts: FeedPost[] = postsPages?.pages.flatMap((p) => p.items) ?? [];

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetch("/api/events").then((r) => r.json()),
  });

  useEffect(() => {
    function hb() {
      void fetch("/api/presence", { method: "POST" });
    }
    hb();
    const id = setInterval(hb, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLbSrc(null);
        setProfileOpen(false);
        setMobileNavOpen(false);
        setMobileExtraOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mobileDrawerOpen = mobileNavOpen || mobileExtraOpen;

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    function closeIfDesktop() {
      if (mq.matches) {
        setMobileNavOpen(false);
        setMobileExtraOpen(false);
      }
    }
    closeIfDesktop();
    mq.addEventListener("change", closeIfDesktop);
    return () => mq.removeEventListener("change", closeIfDesktop);
  }, []);

  const trending = overview?.trending ?? [];

  return (
    <>
      <div id="app">
        <Topbar
          counts={overview?.counts}
          onOpenProfile={() => {
            setMobileNavOpen(false);
            setMobileExtraOpen(false);
            setProfileOpen(true);
          }}
          onToggleMobileNav={() => {
            setMobileExtraOpen(false);
            setMobileNavOpen((v) => !v);
          }}
          onToggleMobileExtra={() => {
            setMobileNavOpen(false);
            setMobileExtraOpen((v) => !v);
          }}
        />
        <div className={`layout${mobileDrawerOpen ? " layout--drawer-open" : ""}`}>
          {mobileDrawerOpen ? (
            <button
              type="button"
              className="mobile-drawer-scrim"
              aria-label="Закрыть меню"
              onClick={() => {
                setMobileNavOpen(false);
                setMobileExtraOpen(false);
              }}
            />
          ) : null}
          <Sidebar
            trending={trending}
            className={mobileNavOpen ? "sidebar--drawer-open" : undefined}
            onAfterNavigate={() => setMobileNavOpen(false)}
          />
          <div className="main-col" id="main-col">
            <DormBanner dorm={dorm} />
            <Compose />
            <FeedTabs />
            <div id="posts-container">
              {posts.length === 0 ? (
                <div className="empty">Постов пока нет. Будь первым!</div>
              ) : (
                <>
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} onOpenPhoto={setLbSrc} />
                  ))}
                  {hasNextPage ? (
                    <button
                      type="button"
                      className="feed-load-more"
                      disabled={isFetchingNextPage}
                      onClick={() => void fetchNextPage()}
                    >
                      {isFetchingNextPage ? "Загрузка…" : "Показать ещё"}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
          <RightSidebar
            events={events}
            className={mobileExtraOpen ? "right-col--drawer-open" : undefined}
            onNavigateEvents={() => setMobileExtraOpen(false)}
          />
        </div>
      </div>
      <Lightbox src={lbSrc} onClose={() => setLbSrc(null)} />
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
