"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DORMS } from "@/lib/constants";

const GTA_AUDIO_SRC = "/gta_pic/gta-5.mp3";
const TRANSITION_MS = 15_000;

type DormSlug = "1" | "2" | "3";

const CAPTIONS: Record<DormSlug, string[]> = {
  "1": [
    "Волхонка: загрузка легенд…",
    "Волхонка: коридор уже знает твой план",
    "Волхонка: чайник включён — значит, жизнь идёт",
    "Волхонка: соседи одобряют",
  ],
  "2": [
    "Даниловская: подключаем вайб…",
    "Даниловская: тихий этаж, громкие мемы",
    "Даниловская: чат уже не спит",
    "Даниловская: добро пожаловать обратно",
  ],
  "3": [
    "Беговая: прогрев района…",
    "Беговая: кружка найдена (или нет)",
    "Беговая: вечерний режим активирован",
    "Беговая: почти как в игре, только в общаге",
  ],
};

function buildSlides(
  slug: DormSlug,
  urls: string[],
): { image: string; caption: string }[] {
  const caps = CAPTIONS[slug];
  if (urls.length === 0) {
    return [
      {
        image: DORMS[slug].bannerBg,
        caption: `${DORMS[slug].name}: положи картинки в public/gta_pic/ (папка ${slug}, Volxonka, Danilovskaya или Begovaya)`,
      },
    ];
  }
  return urls.map((image, i) => ({
    image,
    caption: caps[i % caps.length] ?? DORMS[slug].name,
  }));
}

type Props = {
  targetSlug: DormSlug;
  onFinished: () => void;
};

export function GtaDormTransition({ targetSlug, onFinished }: Props) {
  const [slides, setSlides] = useState(() => buildSlides(targetSlug, []));
  const [slideIdx, setSlideIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slideTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  const dormName = DORMS[targetSlug].name;

  const slideList = useMemo(() => slides, [slides]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    slideTimerRef.current = null;
    endTimerRef.current = null;
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.currentTime = 0;
        a.loop = false;
      } catch {
        /* ignore */
      }
    }
    document.body.style.overflow = "";
    onFinished();
  }, [onFinished]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    finishedRef.current = false;
    document.body.style.overflow = "hidden";

    let a = audioRef.current;
    if (!a) {
      a = new Audio(GTA_AUDIO_SRC);
      a.preload = "auto";
      audioRef.current = a;
    }
    a.volume = 0.38;
    a.loop = true;
    a.currentTime = 0;
    void a.play().catch(() => {});

    endTimerRef.current = setTimeout(() => finish(), TRANSITION_MS);

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/gta-slides");
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, string[]>;
        if (cancelled) return;
        const urls = data[targetSlug] ?? [];
        if (urls.length > 0) setSlides(buildSlides(targetSlug, urls));
      } catch {
        /* keep fallback slides */
      }
    })();

    return () => {
      cancelled = true;
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      document.body.style.overflow = "";
    };
  }, [targetSlug, finish]);

  useEffect(() => {
    if (slideList.length === 0) return;
    const tickMs = Math.max(
      650,
      Math.floor(TRANSITION_MS / Math.max(6, slideList.length * 2)),
    );
    slideTimerRef.current = setInterval(() => {
      setSlideIdx((i) => (i + 1) % slideList.length);
    }, tickMs);
    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [slideList]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const slide = slideList.length > 0 ? slideList[slideIdx % slideList.length] : null;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="gta-dorm-overlay" role="dialog" aria-modal aria-labelledby="gta-dorm-title">
      <div className="gta-dorm-card">
        <p id="gta-dorm-title" className="gta-dorm-title">
          Загрузка: {dormName}
        </p>
        {slide ? (
          <>
            <div
              className="gta-dorm-image"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="gta-dorm-vignette" />
            <p className="gta-dorm-caption">{slide.caption}</p>
          </>
        ) : null}
        <button type="button" className="gta-dorm-skip" onClick={finish}>
          Пропустить
        </button>
        <div className="gta-dorm-bar" aria-hidden>
          <span className="gta-dorm-bar-fill" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
