"use client";

import { useUiStore, type FeedTab } from "@/store/ui";

const tabs: { id: FeedTab; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "pop", label: "Популярные" },
  { id: "ev", label: "Мероприятия" },
  { id: "lost", label: "Потеряно" },
];

export function FeedTabs() {
  const feedTab = useUiStore((s) => s.feedTab);
  const setFeedTab = useUiStore((s) => s.setFeedTab);

  return (
    <div className="feed-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`feed-tab ${feedTab === t.id ? "on" : ""}`}
          id={`ft-${t.id}`}
          onClick={() => setFeedTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
