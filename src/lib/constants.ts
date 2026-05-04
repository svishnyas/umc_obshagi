export const DORM_SLUGS = ["1", "2", "3"] as const;
export type DormSlug = (typeof DORM_SLUGS)[number];

export const DORMS: Record<
  string,
  { name: string; sub: string; color: string; bannerBg: string }
> = {
  "1": {
    name: "Волхонка",
    sub: "Мужская общага",
    color: "#4B9EFF",
    bannerBg: "/dorm-banners/1.svg",
  },
  "2": {
    name: "Даниловская",
    sub: "Женская общага",
    color: "#FF6BAE",
    bannerBg: "/dorm-banners/2.svg",
  },
  "3": {
    name: "Беговая",
    sub: "Мужская общага",
    color: "#FFB347",
    bannerBg: "/dorm-banners/3.svg",
  },
};

/** Фон баннера на экране «все общаги» */
export const BANNER_BG_ALL = "/dorm-banners/all.svg";

/** Логотип в шапке и на экране входа */
export const BRAND_ICON_SRC = "/иконка форум.jpg";

export const TAGS: Record<
  string,
  { label: string; cls: string }
> = {
  g: { label: "Общее", cls: "tg" },
  q: { label: "Вопрос", cls: "tq" },
  e: { label: "Мероприятие", cls: "te" },
  l: { label: "Потеряно", cls: "tl" },
};
