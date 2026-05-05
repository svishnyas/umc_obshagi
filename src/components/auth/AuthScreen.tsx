"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthScreen() {
  const [tab, setTab] = useState<"in" | "reg">("in");

  return (
    <div id="auth-screen">
      <div className="auth-bg">
        <div
          className="auth-bg-blob"
          style={{
            width: 400,
            height: 400,
            background: "#1ECC8A",
            top: -100,
            left: -100,
          }}
        />
        <div
          className="auth-bg-blob"
          style={{
            width: 300,
            height: 300,
            background: "#4B9EFF",
            bottom: -80,
            right: -60,
          }}
        />
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <span className="brand-umc" aria-hidden>
              УМЦ
            </span>
            <span className="brand-name">общаги</span>
            <span className="brand-tag">Beta</span>
          </div>
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${tab === "in" ? "on" : ""}`}
              id="atab-in"
              onClick={() => setTab("in")}
            >
              Войти
            </button>
            <button
              type="button"
              className={`auth-tab ${tab === "reg" ? "on" : ""}`}
              id="atab-reg"
              onClick={() => setTab("reg")}
            >
              Регистрация
            </button>
          </div>
        </div>
        <div className="auth-body">
          <div style={{ display: tab === "in" ? "block" : "none" }}>
            <LoginForm />
          </div>
          <div style={{ display: tab === "reg" ? "block" : "none" }}>
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
