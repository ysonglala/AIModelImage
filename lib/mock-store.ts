export type TaskStatus = "queued" | "processing" | "success" | "failed";

export type ImageTask = {
  id: string;
  title: string;
  prompt: string;
  taskType: string;
  template: string;
  aspectRatio: string;
  imageCount: number;
  fidelity: string;
  mood: string;
  referenceImages: {
    garment?: string;
    model?: string;
    style?: string;
  };
  status: TaskStatus;
  progress: number;
  resultImages: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __mockImageTasks: Map<string, ImageTask> | undefined;
}

const seedImages = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
];

const tasks = global.__mockImageTasks ?? new Map<string, ImageTask>();
if (!global.__mockImageTasks) {
  global.__mockImageTasks = tasks;

  const now = new Date().toISOString();
  const samples: ImageTask[] = [
    {
      id: "task_seed_1",
      title: "EC-A1 白底验收图",
      prompt: "生成白底电商主图，服装结构与颜色完全保真，适合上架验收。",
      taskType: "白底主图",
      template: "EC-A1 白底验收图",
      aspectRatio: "1:1",
      imageCount: 1,
      fidelity: "强保真",
      mood: "克制",
      referenceImages: {
        garment: seedImages[3],
      },
      status: "success",
      progress: 100,
      resultImages: [seedImages[3]],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "task_seed_2",
      title: "XHS-A1 小红书街拍",
      prompt: "生成灰水泥墙街拍风模特上身图，低饱和，近距离全身构图。",
      taskType: "AI 模特上身图",
      template: "XHS-A1 灰水泥墙街拍",
      aspectRatio: "9:16",
      imageCount: 2,
      fidelity: "强保真",
      mood: "平衡",
      referenceImages: {
        garment: seedImages[2],
        model: seedImages[0],
        style: seedImages[1],
      },
      status: "processing",
      progress: 64,
      resultImages: [seedImages[0]],
      createdAt: now,
      updatedAt: now,
    },
  ];

  samples.forEach((task) => tasks.set(task.id, task));
}

function nextImage(indexOffset = 0) {
  const i = Math.floor(Math.random() * seedImages.length);
  return seedImages[(i + indexOffset) % seedImages.length];
}

export function listTasks() {
  return Array.from(tasks.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getTask(id: string) {
  return tasks.get(id);
}

export function createTask(input: {
  prompt: string;
  taskType: string;
  template: string;
  aspectRatio: string;
  imageCount: number;
  fidelity: string;
  mood: string;
  referenceImages?: ImageTask["referenceImages"];
}) {
  const now = new Date().toISOString();
  const id = `task_${Math.random().toString(36).slice(2, 10)}`;
  const task: ImageTask = {
    id,
    title: input.template,
    prompt: input.prompt,
    taskType: input.taskType,
    template: input.template,
    aspectRatio: input.aspectRatio,
    imageCount: input.imageCount,
    fidelity: input.fidelity,
    mood: input.mood,
    referenceImages: input.referenceImages ?? {},
    status: "queued",
    progress: 8,
    resultImages: [],
    createdAt: now,
    updatedAt: now,
  };

  tasks.set(id, task);
  simulateTaskLifecycle(id);
  return task;
}

function updateTask(id: string, patch: Partial<ImageTask>) {
  const current = tasks.get(id);
  if (!current) return;
  tasks.set(id, {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function simulateTaskLifecycle(id: string) {
  setTimeout(() => {
    updateTask(id, {
      status: "processing",
      progress: 42,
      resultImages: [nextImage()],
    });
  }, 1800);

  setTimeout(() => {
    const success = Math.random() > 0.08;
    if (!success) {
      updateTask(id, {
        status: "failed",
        progress: 100,
        errorMessage: "上游返回超时，建议重试或改用更克制的模板。",
      });
      return;
    }

    updateTask(id, {
      status: "success",
      progress: 100,
      resultImages: [nextImage(), nextImage(1)].slice(0, getTask(id)?.imageCount || 1),
    });
  }, 5200);
}
