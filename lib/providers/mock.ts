import type {
  ImageProvider,
  ProviderSubmitInput,
  ProviderSubmitResult,
  ProviderTaskSnapshot,
} from "./types";

const seedImages = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
];

type MockTaskState = {
  providerTaskId: string;
  createdAt: number;
  imageCount: number;
  prompt: string;
  failed: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __mockProviderTasks: Map<string, MockTaskState> | undefined;
}

const tasks = global.__mockProviderTasks ?? new Map<string, MockTaskState>();
if (!global.__mockProviderTasks) {
  global.__mockProviderTasks = tasks;
}

function nextImage(indexOffset = 0) {
  const i = Math.floor(Math.random() * seedImages.length);
  return seedImages[(i + indexOffset) % seedImages.length];
}

function buildSnapshot(task: MockTaskState): ProviderTaskSnapshot {
  const elapsed = Date.now() - task.createdAt;

  if (elapsed < 1800) {
    return {
      providerTaskId: task.providerTaskId,
      status: "queued",
      progress: 8,
      resultImages: [],
      meta: { stage: "accepted" },
    };
  }

  if (elapsed < 5200) {
    return {
      providerTaskId: task.providerTaskId,
      status: "processing",
      progress: 42,
      resultImages: [nextImage()],
      meta: { stage: "rendering" },
    };
  }

  if (task.failed) {
    return {
      providerTaskId: task.providerTaskId,
      status: "failed",
      progress: 100,
      resultImages: [],
      errorMessage: "上游返回超时，建议重试或改用更克制的模板。",
      meta: { stage: "failed" },
    };
  }

  return {
    providerTaskId: task.providerTaskId,
    status: "success",
    progress: 100,
    resultImages: Array.from({ length: task.imageCount }, (_, index) => nextImage(index)),
    meta: { stage: "completed" },
  };
}

export const mockProvider: ImageProvider = {
  key: "mock",
  label: "Mock Provider",
  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    const providerTaskId = `mock_${input.taskId}`;
    const state: MockTaskState = {
      providerTaskId,
      createdAt: Date.now(),
      imageCount: input.imageCount,
      prompt: input.prompt,
      failed: Math.random() <= 0.08,
    };

    tasks.set(providerTaskId, state);

    return {
      providerTaskId,
      status: "queued",
      progress: 8,
      previewImages: [],
      meta: {
        provider: "mock",
        template: input.template,
      },
    };
  },

  async getTask(providerTaskId: string): Promise<ProviderTaskSnapshot> {
    const task = tasks.get(providerTaskId);
    if (!task) {
      return {
        providerTaskId,
        status: "failed",
        progress: 100,
        resultImages: [],
        errorMessage: "模拟 provider 任务不存在，可能是开发服务重启导致内存状态丢失。",
        meta: { stage: "missing" },
      };
    }

    return buildSnapshot(task);
  },
};
