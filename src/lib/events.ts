const EVENT_V2_PREFIX = "v2|";

export type ParsedEventMeta = {
  startsAtIso: string | null;
  place: string;
};

export function encodeEventMeta(startsAtIso: string, place: string): string {
  return `${EVENT_V2_PREFIX}${startsAtIso}|${encodeURIComponent(place.trim())}`;
}

export function parseEventMeta(dateText: string): ParsedEventMeta {
  if (!dateText.startsWith(EVENT_V2_PREFIX)) {
    return { startsAtIso: null, place: "" };
  }
  const [, startsAtIso, placeEnc = ""] = dateText.split("|");
  return {
    startsAtIso: startsAtIso || null,
    place: decodeURIComponent(placeEnc),
  };
}

export function formatEventDateLabel(startsAtIso: string | null, fallback: string): string {
  if (!startsAtIso) return fallback;
  const d = new Date(startsAtIso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateTimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

