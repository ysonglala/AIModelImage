type JsonRecord = Record<string, unknown>;

export class ProviderError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "ProviderError";
    this.status = options?.status;
    this.details = options?.details;
  }
}

export async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();

  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new ProviderError(`Provider request failed: ${response.status}`, {
      status: response.status,
      details: data,
    });
  }

  return data as T;
}

export function pickString(source: JsonRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export function pickNumber(source: JsonRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

export function pickArray(source: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value;
  }
  return [] as unknown[];
}

export function normalizeStatus(raw: string) {
  const value = raw.toLowerCase();
  if (["queued", "pending", "submitted", "created"].includes(value)) return "queued" as const;
  if (["running", "processing", "in_progress", "working"].includes(value)) return "processing" as const;
  if (["success", "succeeded", "completed", "done", "finished"].includes(value)) return "success" as const;
  if (["failed", "error", "cancelled", "canceled", "timeout"].includes(value)) return "failed" as const;
  return "processing" as const;
}
