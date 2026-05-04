"use client";

import { BANNER_BG_ALL, DORMS } from "@/lib/constants";

type Props = {
  dorm: "all" | "1" | "2" | "3";
};

export function DormBanner({ dorm }: Props) {
  let color = "#1ECC8A";
  let title = "Все общежития";
  let sub = "Лента со всех трёх корпусов";
  let bgSrc = BANNER_BG_ALL;

  if (dorm !== "all") {
    const dc = DORMS[dorm];
    color = dc.color;
    title = dc.name;
    sub = dc.sub;
    bgSrc = dc.bannerBg;
  }

  return (
    <div
      id="dorm-banner"
      className="dorm-banner"
      style={{
        borderColor: `${color}45`,
        boxShadow: `inset 0 1px 0 ${color}18`,
      }}
    >
      <div
        className="dorm-banner__bg"
        style={{ backgroundImage: `url(${bgSrc})` }}
        aria-hidden
      />
      <div className="dorm-banner__content">
        <div className="db-accent" style={{ background: color }} />
        <div className="dorm-banner__titles">
          <div className="db-title" style={{ color }}>
            {title}
          </div>
          <div className="db-sub" style={{ color: `${color}EE` }}>
            {sub}
          </div>
        </div>
      </div>
    </div>
  );
}
