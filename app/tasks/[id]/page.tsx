"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Task = {
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
  status: "queued" | "processing" | "success" | "failed";
  progress: number;
  resultImages: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

const badgeMap: Record<Task["status"], string> = {
  queued: "queued / 排队中",
  processing: "processing / 生成中",
  success: "success / 已完成",
  failed: "failed / 已失败",
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [taskId, setTaskId] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | undefined;

    async function boot() {
      const resolved = await params;
      if (!mounted) return;
      setTaskId(resolved.id);
    }

    boot();

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [params]);

  useEffect(() => {
    if (!taskId || taskId === "undefined") return;

    let active = true;

    async function fetchTask() {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as Task;
      if (active) setTask(data);
      return data;
    }

    fetchTask().then((data) => {
      if (!data || data.status === "success" || data.status === "failed") return;

      const timer = setInterval(async () => {
        const next = await fetchTask();
        if (next && (next.status === "success" || next.status === "failed")) {
          clearInterval(timer);
        }
      }, 1800);

      return () => clearInterval(timer);
    });

    return () => {
      active = false;
    };
  }, [taskId]);

  const accentWidth = useMemo(() => `${task?.progress ?? 0}%`, [task?.progress]);

  if (!taskId || taskId === "undefined") {
    return (
      <main className="grain">
        <div className="shell pageWrap">
          <div className="pageHeader glass">
            <div className="eyebrow">任务详情</div>
            <h1>任务地址不对</h1>
            <p>这通常是创建任务失败后前端没有拿到有效 taskId。现在这个坑我已经补上了，你回首页重新提交一次就行。</p>
            <div className="heroActions" style={{ marginTop: 18 }}>
              <Link className="button" href="/">
                返回首页
              </Link>
              <Link className="ghostButton" href="/dashboard">
                查看任务列表
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="grain">
        <div className="shell pageWrap">
          <div className="pageHeader glass">
            <div className="eyebrow">任务详情</div>
            <h1>正在读取任务...</h1>
            <p>等一下，别急。现在是 mock 接口，读任务不至于太慢。</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grain">
      <div className="shell pageWrap">
        <nav className="nav glass">
          <div className="brand">
            <div className="logoMark" />
            <div>
              <div className="brandTitle">Fabric Muse / 任务详情</div>
              <div className="brandSub">状态轮询 · 结果展示 · 参数回看</div>
            </div>
          </div>
          <div className="navLinks">
            <Link className="pill" href="/dashboard">
              返回任务列表
            </Link>
            <Link className="button" href="/#builder">
              新建任务
            </Link>
          </div>
        </nav>

        <header className="pageHeader glass">
          <div className="eyebrow">Task #{task.id}</div>
          <h1>{task.title}</h1>
          <p>
            这个页面现在已经接上了任务详情 API、自动轮询逻辑和真实的 Nano Banana 文生图 provider。后面再继续补图生图/换装接口时，页面这层不用重搭。
          </p>
        </header>

        <section className="taskGrid">
          <div className="statusCard glass">
            <div className="statusHeader">
              <div>
                <div className="eyebrow">当前状态</div>
                <h2 style={{ marginTop: 10 }}>{badgeMap[task.status]}</h2>
              </div>
              <div className="statusBadge">{task.progress}%</div>
            </div>
            <div className="progressBar">
              <div className="progressFill" style={{ width: accentWidth }} />
            </div>
            <p className="statusSub" style={{ marginTop: 14 }}>
              {task.status === "failed"
                ? task.errorMessage || "任务失败，但错误信息还不够友好，后面应该继续细化。"
                : task.status === "success"
                  ? "任务已经完成，下面就是结果图。"
                  : "任务还在跑，页面会自动轮询刷新，不需要你手动 F5。"}
            </p>

            <div className="resultGrid">
              {(task.resultImages.length ? task.resultImages : [task.referenceImages.garment || task.referenceImages.model || task.referenceImages.style || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80"]).map((image, index) => (
                <div key={`${image}-${index}`} className="resultImage" style={{ backgroundImage: `url(${image})` }} />
              ))}
            </div>

            <div className="heroActions" style={{ marginTop: 20 }}>
              <Link className="button" href="/dashboard">
                返回任务列表
              </Link>
              <Link className="ghostButton" href="/#builder">
                复制参数再做一版
              </Link>
            </div>
          </div>

          <div className="statusCard glass">
            <div className="sectionTitle" style={{ marginBottom: 10 }}>
              <div>
                <h2>任务参数</h2>
                <p className="sectionDesc">这里就是后面你做“复用历史参数”和“给客户复盘为什么这样出图”的基础。</p>
              </div>
            </div>

            <div className="taskMetaGrid">
              <div className="metaCard">
                <h4>任务类型</h4>
                <p>{task.taskType}</p>
              </div>
              <div className="metaCard">
                <h4>模板</h4>
                <p>{task.template}</p>
              </div>
              <div className="metaCard">
                <h4>比例</h4>
                <p>{task.aspectRatio}</p>
              </div>
              <div className="metaCard">
                <h4>张数</h4>
                <p>{task.imageCount} 张</p>
              </div>
              <div className="metaCard">
                <h4>保真强度</h4>
                <p>{task.fidelity}</p>
              </div>
              <div className="metaCard">
                <h4>氛围强度</h4>
                <p>{task.mood}</p>
              </div>
            </div>

            <div className="infoList" style={{ marginTop: 16 }}>
              <div className="infoItem">
                <h4>Prompt</h4>
                <p>{task.prompt}</p>
              </div>
              <div className="infoItem">
                <h4>参考图说明</h4>
                <p>
                  当前页面保留了参考图参数和本地上传能力，但已跑通的这条 Nano Banana 接口是文生图，请把重点先放在 prompt、比例和结果风格。图生图接口后面再继续接。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
