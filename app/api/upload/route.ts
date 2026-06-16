import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const uploadDir = path.join(process.cwd(), "public", "uploads");
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromFile(file: File) {
  const fromName = path.extname(file.name || "").toLowerCase();
  if (fromName) return fromName;

  switch (file.type) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") || "reference");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未收到文件" }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "仅支持 jpg/png/webp/gif 图片上传" }, { status: 400 });
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "单张图片不能超过 10MB" }, { status: 400 });
  }

  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeKind = kind.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "reference";
  const filename = `${safeKind}-${Date.now()}-${randomUUID().slice(0, 8)}${extFromFile(file)}`;
  const diskPath = path.join(uploadDir, filename);

  await writeFile(diskPath, buffer);

  return NextResponse.json({
    ok: true,
    kind: safeKind,
    filename,
    url: `/uploads/${filename}`,
    size: file.size,
    mimeType: file.type,
  });
}
