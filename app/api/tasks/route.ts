import { NextResponse } from "next/server";
import { createTask, listTasks } from "../../../lib/task-store";
import { listProviders } from "../../../lib/providers";

export async function GET() {
  return NextResponse.json({
    tasks: await listTasks(),
    providers: listProviders(),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const task = await createTask({
      prompt: body.prompt || "",
      taskType: body.taskType || "AI 模特上身图",
      template: body.template || "XHS-A1 灰水泥墙街拍",
      aspectRatio: body.aspectRatio || "9:16",
      imageCount: Number(body.imageCount || 1),
      fidelity: body.fidelity || "强保真",
      mood: body.mood || "平衡",
      referenceImages: body.referenceImages,
      provider: body.provider || "mock",
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
