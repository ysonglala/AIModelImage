import type { ImageProvider, ProviderSubmitInput, ProviderSubmitResult, ProviderTaskSnapshot } from "./types";
import { uploadLocalFileToGetToken, isLocalUploadUrl } from "./gettoken-upload";
import { ProviderError, normalizeStatus, pickArray, pickNumber, pickString, requestJson } from "./utils";

const baseUrl = process.env.NANO_BANANA_BASE_URL || "https://nb.gettoken.cn";
const apiKey = process.env.NANO_BANANA_API_KEY || "";
const textToImagePath = process.env.NANO_BANANA_SUBMIT_PATH || "/openapi/v1/banana_pro/text-to-image";
const imageToImagePath = process.env.NANO_BANANA_IMAGE_TO_IMAGE_PATH || "/openapi/v1/banana_pro/image-to-image";
const queryPath = process.env.NANO_BANANA_QUERY_PATH || "/openapi/v1/query";
const resolution = process.env.NANO_BANANA_RESOLUTION || "1k";
const webhookUrl = process.env.NANO_BANANA_WEBHOOK_URL || "";

function joinUrl(path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...(process.env.NANO_BANANA_EXTRA_HEADER_NAME && process.env.NANO_BANANA_EXTRA_HEADER_VALUE
      ? { [process.env.NANO_BANANA_EXTRA_HEADER_NAME]: process.env.NANO_BANANA_EXTRA_HEADER_VALUE }
      : {}),
  };
}

function assertConfigured() {
  if (!apiKey) {
    throw new ProviderError(
      "Nano Banana provider 未配置。请在 .env 中设置 NANO_BANANA_API_KEY。"
    );
  }
}

async function normalizeImageUrls(input: ProviderSubmitInput) {
  const rawUrls = [
    input.referenceImages.garment,
    input.referenceImages.model,
    input.referenceImages.style,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const uniqueUrls = Array.from(new Set(rawUrls));

  return Promise.all(
    uniqueUrls.map(async (url) => {
      if (isLocalUploadUrl(url)) {
        return uploadLocalFileToGetToken(url);
      }
      return url;
    })
  );
}

async function buildSubmitRequest(input: ProviderSubmitInput) {
  const imageUrls = await normalizeImageUrls(input);

  if (imageUrls.length > 10) {
    throw new ProviderError("Nano Banana imageUrls 最多支持 10 张图片。", { details: { count: imageUrls.length } });
  }

  if (imageUrls.length > 0) {
    return {
      path: imageToImagePath,
      body: {
        imageUrls,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio || undefined,
        resolution,
        ...(webhookUrl ? { webhookUrl } : {}),
        clientTaskId: input.taskId,
      },
    };
  }

  return {
    path: textToImagePath,
    body: {
      prompt: input.prompt,
      aspectRatio: input.aspectRatio || "9:16",
      resolution,
      ...(webhookUrl ? { webhookUrl } : {}),
      clientTaskId: input.taskId,
    },
  };
}

function parseResultImages(payload: Record<string, unknown>) {
  return pickArray(payload, ["results", "images", "outputs", "data"]).flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const url = pickString(item as Record<string, unknown>, ["url", "download_url", "imageUrl", "src"]);
      return url ? [url] : [];
    }
    return [];
  });
}

export const nanoBananaProvider: ImageProvider = {
  key: "nano-banana",
  label: "Nano Banana",

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    assertConfigured();

    const request = await buildSubmitRequest(input);
    const response = await requestJson<Record<string, unknown>>(joinUrl(request.path), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(request.body),
    });

    const providerTaskId = pickString(response, ["taskId", "id", "jobId", "requestId"]);
    const rawStatus = pickString(response, ["status", "state"], "RUNNING");
    const progress = pickNumber(response, ["progress", "percent"], rawStatus.toUpperCase() === "SUCCESS" ? 100 : 8);

    if (!providerTaskId) {
      throw new ProviderError("Nano Banana submit 未返回 taskId", { details: response });
    }

    return {
      providerTaskId,
      status: normalizeStatus(rawStatus),
      progress,
      previewImages: parseResultImages(response),
      meta: response,
    };
  },

  async getTask(providerTaskId: string): Promise<ProviderTaskSnapshot> {
    assertConfigured();

    const response = await requestJson<Record<string, unknown>>(joinUrl(queryPath), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ taskId: providerTaskId }),
    });

    const rawStatus = pickString(response, ["status", "state"], "RUNNING");
    const status = normalizeStatus(rawStatus);
    const resultImages = parseResultImages(response);
    const progress = pickNumber(
      response,
      ["progress", "percent"],
      status === "success" || status === "failed" ? 100 : resultImages.length > 0 ? 72 : 36
    );
    const errorMessage =
      pickString(response, ["errorMessage", "error", "message"]) ||
      pickString((response.failedReason as Record<string, unknown>) || {}, ["message", "reason"]);

    return {
      providerTaskId,
      status,
      progress,
      resultImages,
      errorMessage: errorMessage || undefined,
      meta: response,
    };
  },
};
