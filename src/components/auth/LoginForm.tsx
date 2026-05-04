"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CodeInput } from "./CodeInput";

export function LoginForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) {
      setErr("Введи имя");
      return;
    }
    if (!password) {
      setErr("Введи пароль");
      return;
    }
    if (code.length < 6) {
      setErr("Введи полный код");
      return;
    }

    const res = await signIn("credentials", {
      nickname: name.trim(),
      password,
      dormCode: code,
      redirect: false,
    });

    if (res?.error) {
      setErr("Неверные данные или код общаги");
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <form id="aform-in" onSubmit={onSubmit}>
      <div className={`auth-err ${err ? "visible" : ""}`}>{err}</div>
      <div className="field">
        <label htmlFor="l-name">Имя</label>
        <input
          id="l-name"
          placeholder="Твой ник"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="username"
        />
      </div>
      <div className="field">
        <label htmlFor="l-pass">Пароль</label>
        <input
          id="l-pass"
          type="password"
          placeholder="••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="field">
        <label>Код доступа</label>
        <CodeInput value={code} onChange={setCode} />
        <div className="code-hint">
          6-значный код от коменданта или старосты
        </div>
      </div>
      <button type="submit" className="auth-btn">
        Войти
      </button>
    </form>
  );
}
