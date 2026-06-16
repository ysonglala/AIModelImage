# AI Model Image (ai-image-site-mvp)

小服装厂 AI 模特换装 / AI 服装拍摄 MVP：上传服装参考图，按模块化提示词模板（白底验收 EC-A1、灰水泥墙街拍 XHS-A1 等）批量生成模特上身图、详情页氛围图、多颜色同款展示图。

后端目前接入 Nano Banana (GetToken)，已跑通：

- 文生图 `POST /openapi/v1/banana_pro/text-to-image`
- 图生图 `POST /openapi/v1/banana_pro/image-to-image`
- 查询  `POST /openapi/v1/query`
- 本地文件上传  `POST /openapi/v1/media/upload/binary`（在有本地 `/uploads/...` 参考图时自动换成 `download_url`）

详见 [`NANO_BANANA_NOTES.md`](./NANO_BANANA_NOTES.md)。

## 技术栈

- Next.js (App Router, TS)
- Prisma + SQLite (本地 dev)
- Tailwind v4
- Provider 抽象层：`mock` / `generic` / `nano-banana`

## 本地启动

```bash
npm install
npx prisma migrate dev
npm run dev
```

打开 http://localhost:3000 。

## 环境变量

在仓库根目录创建 `.env`（不要提交）：

```env
DATABASE_URL="file:./dev.db"

NANO_BANANA_BASE_URL="https://nb.gettoken.cn"
NANO_BANANA_API_KEY="sk-xxx"
NANO_BANANA_SUBMIT_PATH="/openapi/v1/banana_pro/text-to-image"
NANO_BANANA_IMAGE_TO_IMAGE_PATH="/openapi/v1/banana_pro/image-to-image"
NANO_BANANA_QUERY_PATH="/openapi/v1/query"
NANO_BANANA_UPLOAD_PATH="/openapi/v1/media/upload/binary"
NANO_BANANA_RESOLUTION="1k"
NANO_BANANA_WEBHOOK_URL=""
```

## 当前状态

- ✅ 文生图 / 图生图 submit + query 链路实测通过
- ⏳ 缺后台 worker 周期性同步任务（目前 `getTask` 是 lazy 同步）
- ⏳ 结果图持久化（上游 URL 带 `Expires=...`，需要拉到本地或自建 CDN）
