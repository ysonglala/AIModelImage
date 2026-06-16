import type { ImageProvider, ProviderSubmitInput, ProviderSubmitResult, ProviderTaskSnapshot } from "./types";
import { normalizeStatus, pickArray, pickNumber, pickString, requestJson } from "./utils";

type GenericProviderOptions = {
  key: string;
  label: string;
  baseUrl: string;
  apiKey?: string;
  submitPath: string;
  queryPathTemplate: string;
  headers?: Record<string, string>;
};

type GenericSubmitResponse = Record<string, unknown>;
type GenericQueryResponse = Record<string, unknown>;

function buildHeaders(apiKey?: string, extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    ...(extra || {}),
  };
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function buildPromptPayload(input: ProviderSubmitInput) {
  return {
    prompt: input.prompt,
    taskType: input.taskType,
    template: input.template,
    aspectRatio: input.aspectRatio,
    imageCount: input.imageCount,
    fidelity: input.fidelity,
    mood: input.mood,
    referenceImages: input.referenceImages,
  };
}

export function createGenericImageProvider(options: GenericProviderOptions): ImageProvider {
  return {
    key: options.key,
    label: options.label,

    async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
      const response = await requestJson<GenericSubmitResponse>(joinUrl(options.baseUrl, options.submitPath), {
        method: "POST",
        headers: buildHeaders(options.apiKey, options.headers),
        body: JSON.stringify(buildPromptPayload(input)),
      });

      const providerTaskId = pickString(response, ["taskId", "id", "jobId", "requestId"]);
      const rawStatus = pickString(response, ["status", "state"], "queued");
      const progress = pickNumber(response, ["progress", "percent"], 8);
      const previewImages = pickArray(response, ["previewImages", "images", "outputs"]).filter(
        (item): item is string => typeof item === "string"
      );

      return {
        providerTaskId,
        status: normalizeStatus(rawStatus),
        progress,
        previewImages,
        meta: response,
      };
    },

    async getTask(providerTaskId: string): Promise<ProviderTaskSnapshot> {
      const queryPath = options.queryPathTemplate.replace(":id", providerTaskId);
      const response = await requestJson<GenericQueryResponse>(joinUrl(options.baseUrl, queryPath), {
        method: "GET",
        headers: buildHeaders(options.apiKey, options.headers),
      });

      const rawStatus = pickString(response, ["status", "state"], "processing");
      const progress = pickNumber(response, ["progress", "percent"], 0);
      const resultImages = pickArray(response, ["resultImages", "images", "outputs", "data"]).flatMap((item) => {
        if (typeof item === "string") return [item];
        if (item && typeof item === "object") {
          const url = pickString(item as Record<string, unknown>, ["url", "imageUrl", "src"]);
          return url ? [url] : [];
        }
        return [];
      });
      const errorMessage = pickString(response, ["error", "message", "errorMessage"]);

      return {
        providerTaskId,
        status: normalizeStatus(rawStatus),
        progress,
        resultImages,
        errorMessage: errorMessage || undefined,
        meta: response,
      };
    },
  };
}
