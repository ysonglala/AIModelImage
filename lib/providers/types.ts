export type ProviderTaskStatus = "queued" | "processing" | "success" | "failed";

export type ProviderReferenceImages = {
  garment?: string;
  model?: string;
  style?: string;
};

export type ProviderSubmitInput = {
  taskId: string;
  prompt: string;
  taskType: string;
  template: string;
  aspectRatio: string;
  imageCount: number;
  fidelity: string;
  mood: string;
  referenceImages: ProviderReferenceImages;
};

export type ProviderSubmitResult = {
  providerTaskId: string;
  status: ProviderTaskStatus;
  progress: number;
  previewImages?: string[];
  meta?: Record<string, unknown>;
};

export type ProviderTaskSnapshot = {
  providerTaskId: string;
  status: ProviderTaskStatus;
  progress: number;
  resultImages: string[];
  errorMessage?: string;
  meta?: Record<string, unknown>;
};

export interface ImageProvider {
  key: string;
  label: string;
  submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult>;
  getTask(providerTaskId: string): Promise<ProviderTaskSnapshot>;
}
