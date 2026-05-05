"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { TAGS } from "@/lib/constants";
import { dormBg, dormColor, ini } from "@/lib/utils";

export function ProfilePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: () => fetch("/api/users/me").then((r) => r.json()),
    enabled: open,
  });

  const slug = session?.user?.dormSlug ?? "1";
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropName, setCropName] = useState("");

  function handleAv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(f));
    setCropName(f.name);
    setCropOpen(true);
  }

  async function applyAvatarFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", "avatar");
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) return;
    const { url } = await up.json();
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url }),
    });
    router.refresh();
    await qc.invalidateQueries({ queryKey: ["me-profile"] });
  }

  function closeCrop() {
    setCropOpen(false);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    setCropName("");
  }

  async function doLogout() {
    await signOut({ callbackUrl: "/auth" });
    onClose();
  }

  return (
    <>
      <div
        className={`pp-ov ${open ? "show" : ""}`}
        id="pp-ov"
        onClick={onClose}
        aria-hidden={!open}
      />
      <div className={`pp ${open ? "open" : ""}`} id="pp">
        <button type="button" className="pp-close" onClick={onClose}>
          &#10005;
        </button>
        <div
          className="pp-av"
          id="pp-av"
          onClick={() => document.getElementById("pp-av-inp")?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              document.getElementById("pp-av-inp")?.click();
          }}
        >
          {session?.user?.image ? (
            <>
              <Image
                src={session.user.image}
                alt=""
                width={72}
                height={72}
                unoptimized
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
              <div className="av-ov">Сменить</div>
            </>
          ) : (
            <>
              <span style={{ color: dormColor(slug), background: dormBg(slug) }}>
                {ini(session?.user?.name ?? "?")}
              </span>
              <div className="av-ov">Сменить</div>
            </>
          )}
        </div>
        <input
          type="file"
          id="pp-av-inp"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAv}
        />
        <ImageCropModal
          open={cropOpen}
          imageSrc={cropSrc}
          variant="avatar"
          fileName={cropName || "avatar.jpg"}
          onClose={closeCrop}
          onComplete={(f) => {
            void applyAvatarFile(f);
            closeCrop();
          }}
        />
        <div className="pp-name" id="pp-name">
          {session?.user?.name}
        </div>
        <div className="pp-meta" id="pp-meta">
          {profile?.dormName}
          {profile?.room ? ` · комн. ${profile.room}` : ""}
        </div>
        <div className="pp-stats">
          <div className="pp-stat">
            <div className="pp-stat-n">{profile?.dormName ?? "—"}</div>
            <div className="pp-stat-l">Общежитие</div>
          </div>
          <div className="pp-stat">
            <div className="pp-stat-n">{profile?.room ? `#${profile.room}` : "Не указана"}</div>
            <div className="pp-stat-l">Комната</div>
          </div>
          <div className="pp-stat">
            <div className="pp-stat-n">
              {session?.user?.isOwner ? "Староста" : "Студент"}
            </div>
            <div className="pp-stat-l">Роль</div>
          </div>
        </div>
        <div className="pp-sec">Мои посты</div>
        <div id="pp-posts">
          {(profile?.posts ?? []).length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text3)" }}>
              Постов пока нет
            </div>
          ) : (
            (profile?.posts ?? []).map(
              (p: {
                id: string;
                tag: string;
                text: string;
                timeLabel: string;
                likes: number;
              }) => (
                <div key={p.id} className="pp-post">
                  <span
                    className={`post-tag ${TAGS[p.tag]?.cls ?? "tg"}`}
                    style={{ display: "inline-block", marginBottom: 5 }}
                  >
                    {TAGS[p.tag]?.label ?? p.tag}
                  </span>
                  <div className="pp-post-txt">{p.text || "[фото]"}</div>
                  <div className="pp-post-meta">
                    {p.timeLabel} · {p.likes} лайков
                  </div>
                </div>
              ),
            )
          )}
        </div>
        <button type="button" className="pp-logout" onClick={doLogout}>
          Выйти из аккаунта
        </button>
      </div>
    </>
  );
}
