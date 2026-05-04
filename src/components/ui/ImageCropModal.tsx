"use client";

import "react-easy-crop/react-easy-crop.css";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { blobToFile, getCroppedImageBlob } from "@/lib/crop-image";

export type CropVariant = "avatar" | "banner" | "post";

const VARIANT_ASPECT: Record<CropVariant, number> = {
  avatar: 1,
  banner: 16 / 9,
  post: 4 / 5,
};

type Props = {
  open: boolean;
  imageSrc: string | null;
  variant: CropVariant;
  fileName: string;
  onClose: () => void;
  onComplete: (file: File) => void;
};

export function ImageCropModal({
  open,
  imageSrc,
  variant,
  fileName,
  onClose,
  onComplete,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(VARIANT_ASPECT[variant]);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspect(VARIANT_ASPECT[variant]);
      setPixels(null);
    }
  }, [open, variant, imageSrc]);

  const onCropComplete = useCallback(
    (_c: Area, croppedPixels: Area) => {
      setPixels(croppedPixels);
    },
    [],
  );

  async function confirm() {
    if (!imageSrc || !pixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, pixels);
      const file = blobToFile(blob, fileName);
      onComplete(file);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open || !imageSrc) return null;

  const postAspectPresets =
    variant === "post"
      ? [
          { label: "4:5", v: 4 / 5 },
          { label: "1:1", v: 1 },
          { label: "4:3", v: 4 / 3 },
          { label: "3:4", v: 3 / 4 },
          { label: "16:9", v: 16 / 9 },
        ]
      : null;

  return (
    <div className="crop-modal-root" role="dialog" aria-modal aria-labelledby="crop-modal-title">
      <button type="button" className="crop-modal-scrim" onClick={onClose} aria-label="Закрыть" />
      <div className="crop-modal-panel">
        <h2 id="crop-modal-title" className="crop-modal-title">
          {variant === "avatar"
            ? "Аватар"
            : variant === "banner"
              ? "Обложка"
              : "Фото"}
        </h2>
        {postAspectPresets ? (
          <div className="crop-aspect-row" role="group" aria-label="Соотношение сторон">
            {postAspectPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`crop-aspect-btn${Math.abs(aspect - p.v) < 0.01 ? " on" : ""}`}
                onClick={() => setAspect(p.v)}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
        <div
          className="crop-modal-stage"
          style={{ position: "relative", width: "100%", height: 280 }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={variant === "avatar" ? "round" : "rect"}
            showGrid={variant !== "avatar"}
          />
        </div>
        <label className="crop-zoom-lbl">
          Масштаб
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <div className="crop-modal-actions">
          <button type="button" className="crop-btn ghost" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            className="crop-btn primary"
            onClick={() => void confirm()}
            disabled={busy || !pixels}
          >
            {busy ? "…" : "Готово"}
          </button>
        </div>
      </div>
    </div>
  );
}
