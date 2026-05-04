"use client";

import {
  useCallback,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function CodeInput({ value, onChange }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = useCallback(
    (index: number, digit: string) => {
      const chars = value.padEnd(6, " ").slice(0, 6).split("");
      chars[index] = digit;
      onChange(chars.join("").replace(/\s/g, "").slice(0, 6));
    },
    [onChange, value],
  );

  const digits = [...value.padEnd(6, " ")].slice(0, 6);

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    onChange(t);
    const nextEmpty = Math.min(t.length, 5);
    refs.current[nextEmpty]?.focus();
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !e.currentTarget.value && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="code-row" onPaste={onPaste}>
      {digits.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="cbox"
          maxLength={1}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={ch === " " ? "" : ch}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, d);
            if (d && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
        />
      ))}
    </div>
  );
}
