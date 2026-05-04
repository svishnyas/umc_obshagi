"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { CodeInput } from "./CodeInput";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [room, setRoom] = useState("");
  const [dorm, setDorm] = useState("1");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropName, setCropName] = useState("");

  function closeCrop() {
    setCropOpen(false);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    setCropName("");
  }

  function handleRegAv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(f));
    setCropName(f.name);
    setCropOpen(true);
  }

  function onRegAvatarCropped(file: File) {
    setAvatarFile(file);
    const r = new FileReader();
    r.onload = () => setAvatarPreview(r.result as string);
    r.readAsDataURL(file);
    closeCrop();
  }

  function ini(n: string) {
    return n
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) {
      setErr("Введи имя");
      return;
    }
    if (password.length < 6) {
      setErr("Пароль минимум 6 символов");
      return;
    }
    if (code.length < 6) {
      setErr("Введи полный код");
      return;
    }

    const regRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: name.trim(),
        password,
        dormSlug: dorm,
        dormCode: code,
        room: room.trim() || null,
      }),
    });

    const regJson = await regRes.json().catch(() => ({}));
    if (!regRes.ok) {
      const parts: string[] = [];
      if (typeof regJson.error === "string") parts.push(regJson.error);
      if (Array.isArray(regJson.details)) {
        for (const d of regJson.details) {
          if (typeof d === "string" && d && !parts.includes(d)) parts.push(d);
        }
      }
      setErr(parts.length ? parts.join("\n") : "Ошибка регистрации");
      return;
    }

    const sign = await signIn("credentials", {
      nickname: name.trim(),
      password,
      dormCode: code,
      redirect: false,
    });

    if (sign?.error) {
      setErr("Аккаунт создан, но вход не удался — попробуй войти вручную");
      return;
    }

    if (avatarFile) {
      const fd = new FormData();
      fd.append("file", avatarFile);
      fd.append("purpose", "avatar");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (up.ok) {
        const { url } = await up.json();
        await fetch("/api/users/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: url }),
        });
      }
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <form id="aform-reg" onSubmit={onSubmit}>
      <div className={`auth-err ${err ? "visible" : ""}`}>{err}</div>
      <div
        className="av-pick"
        onClick={() => document.getElementById("reg-av-inp")?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("reg-av-inp")?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="av-circle" id="reg-av-c">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="" width={52} height={52} />
          ) : name.trim() ? (
            ini(name)
          ) : (
            "?"
          )}
        </div>
        <div className="av-pick-info">
          <b>Фото профиля</b>
          <span>Нажми чтобы загрузить</span>
        </div>
        <input
          type="file"
          id="reg-av-inp"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleRegAv}
        />
        <ImageCropModal
          open={cropOpen}
          imageSrc={cropSrc}
          variant="avatar"
          fileName={cropName || "avatar.jpg"}
          onClose={closeCrop}
          onComplete={onRegAvatarCropped}
        />
      </div>
      <div className="field">
        <label htmlFor="r-name">Имя</label>
        <input
          id="r-name"
          placeholder="Как тебя зовут?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
        />
      </div>
      <div className="field">
        <label htmlFor="r-pass">Пароль</label>
        <input
          id="r-pass"
          type="password"
          placeholder="Минимум 6 символов"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="field">
        <label htmlFor="r-dorm">Общежитие</label>
        <select
          id="r-dorm"
          value={dorm}
          onChange={(e) => setDorm(e.target.value)}
        >
          <option value="1">Волхонка (мужская)</option>
          <option value="2">Даниловская (женская)</option>
          <option value="3">Беговая (мужская)</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="r-room">Комната</label>
        <input
          id="r-room"
          placeholder="Например: 214"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Код доступа</label>
        <CodeInput value={code} onChange={setCode} />
        <div className="code-hint">
          Получи у коменданта — коды для каждой общаги разные
        </div>
      </div>
      <button type="submit" className="auth-btn">
        Создать аккаунт
      </button>
    </form>
  );
}
