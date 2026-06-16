"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { UploadKind, UploadResult } from "../lib/upload-types";

const taskTypes = ["商业广告海报", "产品主视觉", "小红书封面图", "详情页氛围图"];
const templates = [
  "城市夜景商业海报",
  "白底极简主视觉",
  "买手店质感封面",
  "情绪化详情页氛围图",
];
const aspects = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5", "21:9"];
const fidelityOptions = ["标准", "强商业感", "高细节"];
const moodOptions = ["克制", "平衡", "更有氛围"];
const defaultRefs = {
  garment: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
  model: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
  style: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80",
};

type UploadState = {
  file?: File;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
};

type ProviderOption = {
  key: string;
  label: string;
};

export default function HomePage() {
  const router = useRouter();
  const [taskType, setTaskType] = useState(taskTypes[0]);
  const [template, setTemplate] = useState(templates[0]);
  const [aspectRatio, setAspectRatio] = useState(aspects[0]);
  const [imageCount, setImageCount] = useState(1);
  const [fidelity, setFidelity] = useState(fidelityOptions[1]);
  const [mood, setMood] = useState(moodOptions[1]);
  const [provider, setProvider] = useState("nano-banana");
  const [providers, setProviders] = useState<ProviderOption[]>([
    { key: "nano-banana", label: "Nano Banana" },
    { key: "mock", label: "Mock Provider" },
  ]);
  const [prompt, setPrompt] = useState(
    "一组品牌广告海报，主视觉为城市夜景中的产品陈列，电影级打光，商业质感。"
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploadMap, setUploadMap] = useState<Record<UploadKind, UploadState>>({
    garment: {},
    model: {},
    style: {},
  });

  useEffect(() => {
    fetch("/api/tasks", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { providers?: ProviderOption[] }) => {
        if (data.providers?.length) {
          setProviders(data.providers);
          if (data.providers.some((item) => item.key === "nano-banana")) {
            setProvider("nano-banana");
          }
        }
      })
      .catch(() => undefined);
  }, []);

  const previewRefs = useMemo(
    () => ({
      garment: uploadMap.garment.uploadedUrl || defaultRefs.garment,
      model: uploadMap.model.uploadedUrl || defaultRefs.model,
      style: uploadMap.style.uploadedUrl || defaultRefs.style,
    }),
    [uploadMap]
  );

  function setUploadState(kind: UploadKind, patch: Partial<UploadState>) {
    setUploadMap((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...patch,
      },
    }));
  }

  function handleFileChange(kind: UploadKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState(kind, {
      file,
      uploadedUrl: undefined,
      error: undefined,
    });
  }

  async function uploadOne(kind: UploadKind) {
    const target = uploadMap[kind];
    if (!target?.file) return target?.uploadedUrl;

    setUploadState(kind, { uploading: true, error: undefined });

    try {
      const formData = new FormData();
      formData.append("file", target.file);
      formData.append("kind", kind);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResult | { error?: string };

      if (!response.ok || !("url" in data)) {
        throw new Error("error" in data ? data.error || "上传失败" : "上传失败");
      }

      setUploadState(kind, {
        uploading: false,
        uploadedUrl: data.url,
        error: undefined,
      });

      return data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      setUploadState(kind, {
        uploading: false,
        error: message,
      });
      throw error;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const [garment, model, style] = await Promise.all([
        uploadOne("garment"),
        uploadOne("model"),
        uploadOne("style"),
      ]);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          taskType,
          template,
          aspectRatio,
          imageCount,
          fidelity,
          mood,
          provider: provider,
          referenceImages: {
            garment: garment || defaultRefs.garment,
            model: model || defaultRefs.model,
            style: style || defaultRefs.style,
          },
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        throw new Error(data.error || "创建任务失败，接口没有返回有效 task id");
      }

      router.push(`/tasks/${data.id}`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "创建任务失败";
      alert(`创建任务失败：${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grain">
      <div className="shell">
        <nav className="nav glass">
          <div className="brand">
            <div className="logoMark" />
            <div>
              <div className="brandTitle">Fabric Muse / AI 商业出图工作台</div>
              <div className="brandSub">服装上新图 · AI 模特图 · 小红书风出图</div>
            </div>
          </div>
          <div className="navLinks">
            <a className="pill" href="#hero">首页</a>
            <a className="pill" href="#builder">开始生成</a>
            <Link className="pill" href="/dashboard">
              我的任务
            </Link>
            <a className="button" href="#builder">立即体验</a>
          </div>
        </nav>

        <section className="hero" id="hero">
          <div className="heroCopy glass">
            <div className="eyebrow">最小可运行版本 / MVP</div>
            <h1 className="heroTitle">把衣服图和参考图，变成能上架的视觉成品</h1>
            <p className="heroLead">
              现在这版已经先按 GetToken / Nano Banana 的真实文生图接口跑通。重点先不是换装，而是把商业海报、产品主视觉、小红书封面和氛围图的真实生成链路打透，再往图生图和服装保真升级。
            </p>
            <div className="heroActions">
              <a className="button" href="#builder">开始生成第一张</a>
              <Link className="ghostButton" href="/dashboard">
                查看历史任务
              </Link>
            </div>
            <div className="metricGrid">
              <div className="metric">
                <strong>4 类</strong>
                <span>商业海报 / 产品主视觉 / 小红书封面 / 详情页氛围图</span>
              </div>
              <div className="metric">
                <strong>3 步</strong>
                <span>上传素材、选模板、提交任务，不让用户被空白 prompt 吓傻。</span>
              </div>
              <div className="metric">
                <strong>1 个现实</strong>
                <span>先把 GetToken 文生图接口跑通，再继续抹图生图和服装保真，不装懂最省时间。</span>
              </div>
            </div>
          </div>

          <div className="heroShowcase glass">
            <div className="mosaic">
              <div
                className="mosaicMain"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80)",
                }}
              >
                <div className="label">AI 模特上身图 / 小红书街拍</div>
              </div>
              <div className="mosaicStack">
                <div
                  className="mosaicSideItem"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80)",
                  }}
                >
                  <div className="label">服装参考图</div>
                </div>
                <div
                  className="mosaicSideItem"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80)",
                  }}
                >
                  <div className="label">买手店氛围图</div>
                </div>
              </div>
            </div>
            <div className="heroActions" style={{ marginTop: 14 }}>
              <span className="pill">EC-A1 白底验收图</span>
              <span className="pill">EC-A2 浅灰棚拍</span>
              <span className="pill">XHS-A1 灰水泥墙</span>
            </div>
          </div>
        </section>

        <section className="sectionGrid">
          <div className="sectionCard glass">
            <div className="sectionTitle">
              <div>
                <h2>常用模板</h2>
                <p className="sectionDesc">
                  第一阶段最值钱的不是“用户随便输 prompt”，而是模板化交付。这样才更稳定，也更像能收钱的工具。
                </p>
              </div>
            </div>
            <div className="twoColCards">
              {templates.map((item, index) => (
                <div className="tile" key={item}>
                  <div>
                    <div className="tileTag">{index === 0 ? "XHS-A1" : index === 1 ? "EC-A1" : index === 2 ? "EC-A2" : "XHS-B1"}</div>
                    <h3>{item}</h3>
                    <p>
                      {index === 0 && "灰水泥墙街拍，适合种草和自然穿搭图。"}
                      {index === 1 && "电商主图和验收优先，先保证服装结构别跑偏。"}
                      {index === 2 && "比纯白底更高级一点，适合整店统一风格。"}
                      {index === 3 && "奶油白买手店调性，更像精品女装店实拍。"}
                    </p>
                  </div>
                  <span className="pill">用这个生成</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sectionCard glass">
            <div className="sectionTitle">
              <div>
                <h2>适合的场景</h2>
                <p className="sectionDesc">
                  这个骨架不是给“AI 玩家”做的，是给想把图做成业务的人用的。说白了，得对结果负责。
                </p>
              </div>
            </div>
            <div className="twoColCards">
              {[
                ["服装厂新品上架", "一件衣服四个颜色，快速生成统一模特图和主图。"],
                ["档口 / 电商补图", "有平铺图和挂拍图，就能补一套像样的上新视觉。"],
                ["小红书种草内容", "同款衣服做多套风格图，适合做封面和详情页。"],
                ["详情页氛围图", "别只会出白底，氛围图更容易把质感往上抬。"],
              ].map(([title, text]) => (
                <div className="tile" key={title}>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="builderGrid" id="builder">
          <form className="formCard glass" onSubmit={handleSubmit}>
            <h2>开始生成</h2>
            <p className="formSub">
              这就是最小可运行版的创建页。当前已经按 GetToken / Nano Banana 的真实文生图接口跑通：核心参数是 prompt、aspectRatio、resolution、webhookUrl、clientTaskId。图生图和服装参考后面再继续对齐。
            </p>

            <div className="formGrid">
              <div className="field">
                <label>任务类型</label>
                <div className="segment">
                  {taskTypes.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`chip ${taskType === item ? "chipActive" : ""}`}
                      onClick={() => setTaskType(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>模板选择</label>
                <div className="segment">
                  {templates.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`chip ${template === item ? "chipActive" : ""}`}
                      onClick={() => setTemplate(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>正向提示词</label>
                <textarea
                  className="textarea"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </div>

              <div className="field">
                <label>上传参考图（本地上传已接好，但当前文生图接口暂不会使用这些参考图）</label>
                <div className="uploadGrid">
                  {([
                    [
                      "garment",
                      "服装参考图",
                      "优先上传平铺图 / 挂拍图 / 白底图。衣服越清晰，保真越稳。",
                      previewRefs.garment,
                    ],
                    [
                      "model",
                      "模特参考图",
                      "控制脸、发型、裤子、鞋子、配饰和整体搭配气质。",
                      previewRefs.model,
                    ],
                    [
                      "style",
                      "风格参考图",
                      "锁定小红书风 / 买手店风 / 白底棚拍风的画面调性。",
                      previewRefs.style,
                    ],
                  ] as const).map(([kind, title, text, image]) => (
                    <div className="uploadBox" key={title}>
                      <div>
                        <h4>{title}</h4>
                        <p>{text}</p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(event) => handleFileChange(kind, event)}
                          style={{ marginTop: 10 }}
                        />
                        <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                          {uploadMap[kind].file ? `已选择：${uploadMap[kind].file?.name}` : "未选择文件，将继续使用默认占位图。"}
                        </p>
                        {uploadMap[kind].uploading ? <p style={{ fontSize: 12 }}>上传中...</p> : null}
                        {uploadMap[kind].uploadedUrl ? <p style={{ fontSize: 12 }}>已上传：{uploadMap[kind].uploadedUrl}</p> : null}
                        {uploadMap[kind].error ? <p style={{ fontSize: 12, color: "#a33" }}>上传失败：{uploadMap[kind].error}</p> : null}
                      </div>
                      <div className="uploadThumb" style={{ backgroundImage: `url(${image})` }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="twoCols">
                <div className="field">
                  <label>尺寸比例</label>
                  <select
                    className="select"
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value)}
                  >
                    {aspects.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>生成张数</label>
                  <select
                    className="select"
                    value={imageCount}
                    onChange={(event) => setImageCount(Number(event.target.value))}
                  >
                    {[1, 2, 4].map((item) => (
                      <option key={item} value={item}>
                        {item} 张
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Provider 选择</label>
                <select className="select" value={provider} onChange={(event) => setProvider(event.target.value)}>
                  {providers.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label} ({item.key})
                    </option>
                  ))}
                </select>
                <p style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                  当前已确认：后续 `imageUrls` 支持公共 URL 或 Base64 Data URI；如果走 Base64，要注意整包 JSON（包含 prompt 等字段）总大小大约别超过 10MB。
                </p>
              </div>

              <div className="twoCols">
                <div className="field">
                  <label>服装保真强度</label>
                  <div className="segment">
                    {fidelityOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`chip ${fidelity === item ? "chipActive" : ""}`}
                        onClick={() => setFidelity(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>画面风格强度</label>
                  <div className="segment">
                    {moodOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`chip ${mood === item ? "chipActive" : ""}`}
                        onClick={() => setMood(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="submitRow">
                <div className="meta">
                  预计耗时：30~90 秒 · nano-banana 文生图已接通 · 当前建议优先测试 prompt / aspectRatio / resolution 的真实效果，别急着把图生图脑补成已经好了
                </div>
                <button className="button" type="submit" disabled={submitting}>
                  {submitting ? "正在创建任务..." : "开始生成任务 →"}
                </button>
              </div>
            </div>
          </form>

          <aside className="previewCard glass">
            <h2>右侧预览区</h2>
            <p className="previewSub">
              这块用来压住用户焦虑：你得让他知道自己在生成什么，而不是点完按钮以后只能干瞪眼。
            </p>

            <div
              className="previewImage"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80)",
              }}
            >
              <div className="previewOverlay">
                <h3>当前预期效果：{template}</h3>
                <p>
                  {aspectRatio} 比例 · {taskType} · {fidelity} · {mood}。第一张先看结构和保真，满意后再批量扩图，这才像做生意，不像抽卡。
                </p>
              </div>
            </div>

            <div className="infoList" style={{ marginTop: 18 }}>
              <div className="infoItem">
                <h4>模板建议</h4>
                <p>如果第一轮是给客户验收，优先用 EC-A1 或 EC-A2。XHS 模板适合做种草感，不适合第一轮查衣服细节。</p>
              </div>
              <div className="infoItem">
                <h4>素材建议</h4>
                <p>模特图别拿半身自拍来控制全身图，服装图尽量避免强遮挡和过度褶皱，别自己给模型上难度。</p>
              </div>
              <div className="infoItem">
                <h4>产品方向</h4>
                <p>下一步更建议把“自由 prompt”逐步收起来，变成结构化模板工作流：产品编号 + 模板 + 姿势 + 用途。</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="taskGrid">
          <div className="statusCard glass">
            <div className="statusHeader">
              <div>
                <div className="eyebrow">任务结果页预览</div>
                <h2 style={{ marginTop: 10 }}>任务状态与结果展示</h2>
              </div>
              <div className="statusBadge">processing / mock</div>
            </div>
            <div className="progressBar">
              <div className="progressFill" style={{ width: "68%" }} />
            </div>
            <p className="statusSub" style={{ marginTop: 14 }}>
              真正上线后，这里对应 <code>/tasks/[id]</code>。重点是：别让状态太空、别让下载太深、别让失败信息像放屁一样没营养。
            </p>
            <div className="resultGrid">
              {[
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
              ].map((image) => (
                <div key={image} className="resultImage" style={{ backgroundImage: `url(${image})` }} />
              ))}
            </div>
          </div>

          <div className="statusCard glass">
            <div className="sectionTitle" style={{ marginBottom: 10 }}>
              <div>
                <h2>历史任务入口</h2>
                <p className="sectionDesc">你后面最容易忽略的就是复用。实际上，复用老任务参数比重新乱写 prompt 更有商业价值。</p>
              </div>
            </div>
            <div className="historyList">
              {[
                [
                  "EC-A1 白底验收图",
                  "已完成 · 用于上架主图验收",
                  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
                ],
                [
                  "XHS-A1 小红书街拍",
                  "生成中 · 服装保真优先",
                  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80",
                ],
                [
                  "XHS-B1 买手店氛围图",
                  "已完成 · 适合详情页和种草封面",
                  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
                ],
              ].map(([title, text, image]) => (
                <div className="historyItem" key={title}>
                  <div className="historyThumb" style={{ backgroundImage: `url(${image})` }} />
                  <div className="historyMeta">
                    <h4>{title}</h4>
                    <p>{text}</p>
                  </div>
                  <Link className="smallButton" href="/dashboard">
                    查看
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p className="footerNote">
          现在这个项目已经不是静态 HTML 了，而是一个真正可跑的 Next.js 骨架。<br />
          下一步最合理的是：把本地上传升级到对象存储、接真实 provider、再补登录和后台，不用再从零搭壳子。
        </p>
      </div>
    </main>
  );
}
