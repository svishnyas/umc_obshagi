"use client";

type Props = {
  src: string | null;
  onClose: () => void;
};

export function Lightbox({ src, onClose }: Props) {
  if (!src) return null;

  return (
    <div
      className="lb show"
      role="dialog"
      aria-modal
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button
        type="button"
        className="lb-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        &#10005;
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
