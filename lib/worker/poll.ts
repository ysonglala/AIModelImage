import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../db";
import { getProvider } from "../providers";

const RESULTS_DIR = path.join(process.cwd(), "public", "uploads", "results");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function extFromContentType(ct: string | null): string {
  if (!ct) return "png";
  const lower = ct.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("gif")) return "gif";
  return "png";
}

function looksLocal(url: string): boolean {
  return url.startsWith("/uploads/");
}

/**
 * Download a remote URL to public/uploads/results/<taskId>/, return the
 * web-relative path (/uploads/results/<taskId>/<file>). If url is already
 * a local /uploads/... path, return it unchanged.
 */
async function persistResultImage(taskId: string, url: string, index: number): Promise<string> {
  if (!url) return url;
  if (looksLocal(url)) return url;

  const taskDir = path.join(RESULTS_DIR, taskId);
  await ensureDir(taskDir);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download result image (${res.status}) ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type");
  const ext = extFromContentType(ct);
  // stable name from index + short hash of url so re-runs are idempotent
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  const filename = `${String(index + 1).padStart(2, "0")}_${hash}.${ext}`;
  const filePath = path.join(taskDir, filename);
  await fs.writeFile(filePath, buf);
  return `/uploads/results/${taskId}/${filename}`;
}

export type TickStats = {
  scanned: number;
  updated: number;
  succeeded: number;
  failed: number;
  errors: { taskId: string; message: string }[];
};

async function syncOne(taskId: string, provider: string, providerTaskId: string): Promise<{ status: "success" | "failed" | "processing" | "queued"; }> {
  const prov = getProvider(provider);
  const snapshot = await prov.getTask(providerTaskId);

  let persistedImages = snapshot.resultImages ?? [];
  if (snapshot.status === "success" && persistedImages.length > 0) {
    try {
      persistedImages = await Promise.all(
        persistedImages.map((u, i) => persistResultImage(taskId, u, i))
      );
    } catch (err) {
      // fall back to raw URLs if download fails; logging only
      console.warn(`[worker] persist failed for ${taskId}:`, err);
    }
  }

  await prisma.imageTask.update({
    where: { id: taskId },
    data: {
      status: snapshot.status,
      progress: snapshot.progress,
      resultImages: persistedImages,
      errorMessage: snapshot.errorMessage ?? null,
    },
  });

  return { status: snapshot.status };
}

export async function tickOnce(): Promise<TickStats> {
  const stats: TickStats = { scanned: 0, updated: 0, succeeded: 0, failed: 0, errors: [] };

  const pending = await prisma.imageTask.findMany({
    where: {
      AND: [
        { OR: [{ status: "queued" }, { status: "processing" }] },
        { providerTaskId: { not: null } },
        { NOT: { provider: "mock" } },
      ],
    },
    select: { id: true, provider: true, providerTaskId: true },
    take: 20,
  });
  stats.scanned = pending.length;

  // serialize to be polite to upstream
  for (const t of pending) {
    if (!t.providerTaskId) continue;
    try {
      const r = await syncOne(t.id, t.provider, t.providerTaskId);
      stats.updated += 1;
      if (r.status === "success") stats.succeeded += 1;
      if (r.status === "failed") stats.failed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stats.errors.push({ taskId: t.id, message });
      // Mark as failed if upstream explicitly says expired / not found
      if (/已过期|expired|not.*found|404/i.test(message)) {
        try {
          await prisma.imageTask.update({
            where: { id: t.id },
            data: { status: "failed", progress: 100, errorMessage: message },
          });
          stats.failed += 1;
          stats.updated += 1;
        } catch {}
      }
    }
  }

  return stats;
}
