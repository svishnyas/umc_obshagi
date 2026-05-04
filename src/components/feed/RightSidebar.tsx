"use client";

import Link from "next/link";

type EventRow = {
  id: string;
  title: string;
  dateText: string;
  color: string;
  dormLabel: string;
  place?: string;
};

export function RightSidebar({
  events,
  className,
  onNavigateEvents,
}: {
  events: EventRow[];
  className?: string;
  onNavigateEvents?: () => void;
}) {
  return (
    <aside
      className={["right-col", className].filter(Boolean).join(" ")}
      aria-label="События и правила"
    >
      <div className="widget">
        <div className="widget-title">Ближайшие события</div>
        <div id="events-list">
          {events.slice(0, 4).map((ev) => (
            <div key={ev.id} className="event-item">
              <div className="ev-title">{ev.title}</div>
              <div className="ev-meta">
                <div className="ev-dot" style={{ background: ev.color }} />
                {ev.dateText} · {ev.dormLabel}
              </div>
              {ev.place ? <div className="ev-place">{ev.place}</div> : null}
            </div>
          ))}
        </div>
        <Link
          href="/events"
          className="events-open-link"
          onClick={() => onNavigateEvents?.()}
        >
          Открыть страницу событий
        </Link>
      </div>
      <div className="widget">
        <div className="widget-title">Правила форума</div>
        <div className="rule">
          <div className="rule-num">1</div>
          <div className="rule-txt">Уважай соседей и не груби</div>
        </div>
        <div className="rule">
          <div className="rule-num">2</div>
          <div className="rule-txt">Не флуди и не спамь</div>
        </div>
        <div className="rule">
          <div className="rule-num">3</div>
          <div className="rule-txt">Фото — только уместные</div>
        </div>
        <div className="rule">
          <div className="rule-num">4</div>
          <div className="rule-txt">Личные вопросы — в ЛС</div>
        </div>
      </div>
    </aside>
  );
}
