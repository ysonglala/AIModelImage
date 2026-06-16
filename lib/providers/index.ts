import { mockProvider } from "./mock";
import { nanoBananaProvider } from "./nano-banana";
import type { ImageProvider } from "./types";

const providers: Record<string, ImageProvider> = {
  mock: mockProvider,
  "nano-banana": nanoBananaProvider,
};

export function getProvider(key = "mock"): ImageProvider {
  return providers[key] ?? providers.mock;
}

export function listProviders() {
  return Object.values(providers).map((provider) => ({
    key: provider.key,
    label: provider.label,
  }));
}

export type {
  ImageProvider,
  ProviderSubmitInput,
  ProviderSubmitResult,
  ProviderTaskSnapshot,
  ProviderTaskStatus,
  ProviderReferenceImages,
} from "./types";
