import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { saveUploadLocal } from "@/lib/local-upload";
import { isS3Configured, uploadPublicObject } from "@/lib/s3";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Нет файла" }, { status: 400 });
  }

  const type = file.type || "application/octet-stream";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "Недопустимый тип файла" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const max = 5 * 1024 * 1024;
  if (buf.length > max) {
    return NextResponse.json({ error: "Файл больше 5 МБ" }, { status: 400 });
  }

  const ext =
    type === "image/png"
      ? "png"
      : type === "image/webp"
        ? "webp"
        : type === "image/gif"
          ? "gif"
          : "jpg";

  const purposeRaw = form.get("purpose");
  const purpose =
    purposeRaw === "avatar" ||
    purposeRaw === "post" ||
    purposeRaw === "squad_banner" ||
    purposeRaw === "squad_avatar"
      ? purposeRaw
      : purposeRaw == null || purposeRaw === ""
        ? "post"
        : null;
  if (purpose === null) {
    return NextResponse.json({ error: "Некорректное назначение файла" }, { status: 400 });
  }
  const prefix =
    purpose === "avatar"
      ? "avatars"
      : purpose === "squad_banner" || purpose === "squad_avatar"
        ? "squads"
        : "posts";
  const subPath = `${prefix}/${session.user.id}`;

  try {
    if (isS3Configured()) {
      const key = `${subPath}/${randomUUID()}.${ext}`;
      const url = await uploadPublicObject(key, buf, type);
      return NextResponse.json({ url });
    }

    if (process.env.VERCEL === "1") {
      const dataUrl = `data:${type};base64,${buf.toString("base64")}`;
      return NextResponse.json({
        url: dataUrl,
        mode: "inline",
      });
    }

    const path = await saveUploadLocal(subPath, buf, ext);
    return NextResponse.json({ url: path });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Загрузка не удалась" }, { status: 500 });
  }
}
