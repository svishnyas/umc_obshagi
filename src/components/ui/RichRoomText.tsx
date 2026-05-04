"use client";

import Link from "next/link";
import type { RoomTextPart } from "@/lib/room-mentions";
import { dormBg, dormColor } from "@/lib/utils";

export function RichRoomText({
  parts,
  dormSlug,
}: {
  parts: RoomTextPart[];
  dormSlug: string;
}) {
  const bg = dormBg(dormSlug);
  const fg = dormColor(dormSlug);

  return (
    <>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <span key={i}>{p.text}</span>
        ) : p.squadId ? (
          <Link
            key={i}
            href={`/squads/${p.squadId}`}
            className="room-mention room-mention--link"
            style={{
              color: fg,
              background: bg,
            }}
          >
            @{p.label}
          </Link>
        ) : (
          <span
            key={i}
            className="room-mention room-mention--plain"
            style={{
              color: fg,
              background: bg,
            }}
          >
            @{p.label}
          </span>
        ),
      )}
    </>
  );
}
