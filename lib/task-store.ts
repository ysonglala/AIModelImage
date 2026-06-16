import { prisma } from "./db";
import { getProvider } from "./providers";
import type { ImageTask, ReferenceImages, TaskStatus } from "./types";

const seedImages = [
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
];

function toTask(record: {
  id: string;
  provider: string;
  providerTaskId: string | null;
  title: string;
  prompt: string;
  taskType: string;
  template: string;
  aspectRatio: string;
  imageCount: number;
  fidelity: string;
  mood: string;
  referenceImages: unknown;
  status: TaskStatus;
  progress: number;
  resultImages: unknown;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ImageTask {
  return {
    id: record.id,
    provider: record.provider,
    providerTaskId: record.providerTaskId ?? undefined,
    title: record.title,
    prompt: record.prompt,
    taskType: record.taskType,
    template: record.template,
    aspectRatio: record.aspectRatio,
    imageCount: record.imageCount,
    fidelity: record.fidelity,
    mood: record.mood,
    referenceImages: (record.referenceImages ?? {}) as ReferenceImages,
    status: record.status,
    progress: record.progress,
    resultImages: Array.isArray(record.resultImages) ? (record.resultImages as string[]) : [],
    errorMessage: record.errorMessage ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function seedTasksIfEmpty() {
  const count = await prisma.imageTask.count();
  if (count > 0) return;

  await prisma.imageTask.createMany({
    data: [
      {
        id: "task_seed_1",
        provider: "mock",
        providerTaskId: "mock_task_seed_1",
        title: "EC-A1 白底验收图",
        prompt: "生成白底电商主图，服装结构与颜色完全保真，适合上架验收。",
        taskType: "白底主图",
        template: "EC-A1 白底验收图",
        aspectRatio: "1:1",
        imageCount: 1,
        fidelity: "强保真",
        mood: "克制",
        referenceImages: { garment: seedImages[3] },
        status: "success",
        progress: 100,
        resultImages: [seedImages[3]],
      },
      {
        id: "task_seed_2",
        provider: "mock",
        providerTaskId: "mock_task_seed_2",
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
      },
    ],
  });
}

export async function listTasks() {
  await seedTasksIfEmpty();
  const records = await prisma.imageTask.findMany({
    orderBy: { createdAt: "desc" },
  });
  return records.map(toTask);
}

export async function getTask(id: string) {
  await seedTasksIfEmpty();

  const record = await prisma.imageTask.findUnique({ where: { id } });
  if (!record) return null;

  if (record.providerTaskId && (record.status === "queued" || record.status === "processing")) {
    await syncTaskWithProvider(record.id, record.provider, record.providerTaskId);
    const refreshed = await prisma.imageTask.findUnique({ where: { id } });
    return refreshed ? toTask(refreshed) : null;
  }

  return toTask(record);
}

export async function createTask(input: {
  prompt: string;
  taskType: string;
  template: string;
  aspectRatio: string;
  imageCount: number;
  fidelity: string;
  mood: string;
  referenceImages?: ReferenceImages;
  provider?: string;
}) {
  await seedTasksIfEmpty();

  const providerKey = input.provider || "mock";
  const taskId = `task_${Math.random().toString(36).slice(2, 10)}`;

  const created = await prisma.imageTask.create({
    data: {
      id: taskId,
      provider: providerKey,
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
      progress: 5,
      resultImages: [],
    },
  });

  try {
    const provider = getProvider(providerKey);
    const submitted = await provider.submit({
      taskId,
      prompt: input.prompt,
      taskType: input.taskType,
      template: input.template,
      aspectRatio: input.aspectRatio,
      imageCount: input.imageCount,
      fidelity: input.fidelity,
      mood: input.mood,
      referenceImages: input.referenceImages ?? {},
    });

    const updated = await prisma.imageTask.update({
      where: { id: created.id },
      data: {
        providerTaskId: submitted.providerTaskId,
        status: submitted.status,
        progress: submitted.progress,
        resultImages: submitted.previewImages ?? [],
        errorMessage: null,
      },
    });

    return toTask(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider submit failed";

    const failed = await prisma.imageTask.update({
      where: { id: created.id },
      data: {
        status: "failed",
        progress: 100,
        errorMessage: message,
      },
    });

    throw new Error(toTask(failed).errorMessage || message);
  }
}

export async function syncTaskWithProvider(id: string, providerKey: string, providerTaskId: string) {
  const provider = getProvider(providerKey);
  const snapshot = await provider.getTask(providerTaskId);

  await prisma.imageTask.update({
    where: { id },
    data: {
      status: snapshot.status,
      progress: snapshot.progress,
      resultImages: snapshot.resultImages,
      errorMessage: snapshot.errorMessage ?? null,
    },
  });
}
