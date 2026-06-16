export type TaskStatus = "queued" | "processing" | "success" | "failed";

export type ReferenceImages = {
  garment?: string;
  model?: string;
  style?: string;
};

export type ImageTask = {
  id: string;
  provider: string;
  providerTaskId?: string;
  title: string;
  prompt: string;
  taskType: string;
  template: string;
  aspectRatio: string;
  imageCount: number;
  fidelity: string;
  mood: string;
  referenceImages: ReferenceImages;
  status: TaskStatus;
  progress: number;
  resultImages: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
