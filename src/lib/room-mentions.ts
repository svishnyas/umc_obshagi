/** Упоминание комнаты в тексте: `@301`, `@12а` — в рамках общаги автора поста. */

export type RoomTextPart =
  | { kind: "text"; text: string }
  | { kind: "room"; label: string; squadId: string | null };

export const ROOM_TAG_RE = /@([0-9A-Za-zА-Яа-яЁё.\-]+)/g;

export function parseRoomMentionParts(
  text: string,
  dormId: string,
  squadByKey: Map<string, string | null>,
): RoomTextPart[] {
  const parts: RoomTextPart[] = [];
  let last = 0;
  const re = new RegExp(ROOM_TAG_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", text: text.slice(last, m.index) });
    }
    const label = m[1];
    const key = `${dormId}:${label}`;
    parts.push({
      kind: "room",
      label,
      squadId: squadByKey.get(key) ?? null,
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ kind: "text", text: text.slice(last) });
  }
  return parts;
}

/** Превью в композере: сквады текущей общаги из списка. */
export function previewRoomMentionParts(
  text: string,
  squads: { id: string; roomLabel: string }[],
): RoomTextPart[] {
  const byLabel = new Map(squads.map((s) => [s.roomLabel, s.id]));
  const parts: RoomTextPart[] = [];
  let last = 0;
  const re = new RegExp(ROOM_TAG_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ kind: "text", text: text.slice(last, m.index) });
    }
    const label = m[1];
    parts.push({
      kind: "room",
      label,
      squadId: byLabel.get(label) ?? null,
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ kind: "text", text: text.slice(last) });
  }
  return parts;
}

export function collectRoomTagKeysFromTexts(
  texts: Array<{ text: string; dormId: string }>,
): { dormId: string; roomLabel: string }[] {
  const seen = new Set<string>();
  const out: { dormId: string; roomLabel: string }[] = [];
  for (const { text, dormId } of texts) {
    const re = new RegExp(ROOM_TAG_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const label = m[1];
      const k = `${dormId}:${label}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ dormId, roomLabel: label });
    }
  }
  return out;
}
