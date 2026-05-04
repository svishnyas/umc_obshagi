import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

/** Saves under `public/uploads` and returns absolute URL path for the app (e.g. /uploads/posts/...jpg). */
export async function saveUploadLocal(
  subfolder: string,
  buf: Buffer,
  ext: string,
): Promise<string> {
  const root = join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(root, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  const rel = join("uploads", subfolder, name).replace(/\\/g, "/");
  await writeFile(join(process.cwd(), "public", rel), buf);
  return `/${rel}`;
}
