import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = src;
  });
}

/** Вырезает область в координатах исходного изображения (pixelCrop из react-easy-crop). */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  canvas.width = Math.floor(pixelCrop.width);
  canvas.height = Math.floor(pixelCrop.height);

  ctx.drawImage(
    image,
    Math.floor(pixelCrop.x),
    Math.floor(pixelCrop.y),
    Math.floor(pixelCrop.width),
    Math.floor(pixelCrop.height),
    0,
    0,
    Math.floor(pixelCrop.width),
    Math.floor(pixelCrop.height),
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob failed"));
      },
      mimeType,
      quality,
    );
  });
}

export function blobToFile(blob: Blob, originalName: string): File {
  const ext =
    blob.type === "image/png"
      ? ".png"
      : blob.type === "image/webp"
        ? ".webp"
        : ".jpg";
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}${ext}`, { type: blob.type || "image/jpeg" });
}
