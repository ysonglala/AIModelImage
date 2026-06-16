import path from "node:path";
import { readFile } from "node:fs/promises";
import { requestJson, ProviderError, pickString } from "./utils";

type UploadResponse = {
  code?: number;
  message?: string;
  data?: {
    type?: string;
    download_url?: string;
    fileName?: string;
    size?: string | number;
    url?: string;
  };
};

const baseUrl = process.env.NANO_BANANA_BASE_URL || "https://nb.gettoken.cn";
const apiKey = process.env.NANO_BANANA_API_KEY || "";
const uploadPath = process.env.NANO_BANANA_UPLOAD_PATH || "/openapi/v1/media/upload/binary";

function joinUrl(targetPath: string) {
  return `${baseUrl.replace(/\/$/, "")}/${targetPath.replace(/^\//, "")}`;
}

function guessMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export function isLocalUploadUrl(url?: string) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

export async function uploadLocalFileToGetToken(localUrl: string) {
  if (!apiKey) {
    throw new ProviderError("缺少 NANO_BANANA_API_KEY，无法调用 GetToken 上传接口。");
  }

  const diskPath = path.join(process.cwd(), "public", localUrl.replace(/^\//, ""));
  const fileBuffer = await readFile(diskPath);
  const filename = path.basename(diskPath);

  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: guessMimeType(diskPath) });
  form.append("file", blob, filename);

  const response = await fetch(joinUrl(uploadPath), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const text = await response.text();
  let data: UploadResponse | string = text;
  try {
    data = JSON.parse(text) as UploadResponse;
  } catch {
    // keep text
  }

  if (!response.ok) {
    throw new ProviderError(`GetToken 上传失败: ${response.status}`, {
      status: response.status,
      details: data,
    });
  }

  const payload = typeof data === "string" ? {} : data;

  if (typeof payload.code === "number" && payload.code !== 0) {
    throw new ProviderError(`GetToken 上传失败: ${payload.message || payload.code}`, {
      status: response.status,
      details: payload,
    });
  }

  const downloadUrl = pickString((payload.data || {}) as Record<string, unknown>, ["download_url", "url"]);

  if (!downloadUrl) {
    throw new ProviderError("GetToken 上传成功但未返回 download_url", { details: payload });
  }

  return downloadUrl;
}
