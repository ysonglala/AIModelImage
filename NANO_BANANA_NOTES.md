# Nano Banana / GetToken 接入备注

已根据页面 `https://nb.gettoken.cn/model-api?model=banana-pro-text2img&tab=api&lang=curl` 与用户提供的真实 curl 请求示例，做了以下对齐：

## 已对齐的接口约定

- 鉴权方式：`Authorization: Bearer <API_KEY>`
- 默认 baseUrl：`https://nb.gettoken.cn`
- 文生图 submit 路径：`/openapi/v1/banana_pro/text-to-image`
- 图生图 submit 路径：`/openapi/v1/banana_pro/image-to-image`
- 查询接口路径：`/openapi/v1/query`
- 查询方式：`POST`，body 传 `{ "taskId": "..." }`
- 查询终态：`SUCCESS` / `FAILED`
- 运行态：`QUEUED` / `RUNNING`
- 失败扩展态：`TIMEOUT` / `CANCELED`
- 结果图解析：`results[].url`
- 上传接口路径：`/openapi/v1/media/upload/binary`
- webhook 终态回调：任务进入 `SUCCESS` / `FAILED` / `TIMEOUT` / `CANCELED` 后，服务端会向 `webhookUrl` 发起 `POST`

## 当前 provider 行为

文件：`lib/providers/nano-banana.ts`

- `submit()`：当前按真实 curl 自动分流：
  - 无参考图时走文生图 `text-to-image`
  - 有参考图时走图生图 `image-to-image`
- 文生图提交字段：
  - `prompt`
  - `aspectRatio`
  - `resolution`
  - `webhookUrl`（若环境变量已配置）
  - `clientTaskId`
- 图生图提交字段：
  - `imageUrls`
  - `prompt`
  - `aspectRatio`（可选）
  - `resolution`
  - `webhookUrl`（若环境变量已配置）
  - `clientTaskId`
- 图生图 `imageUrls` 当前实现会优先取 `referenceImages.garment/model/style`，去重后最多传 10 张；若是本地 `/uploads/...` 文件，会先自动上传到 GetToken 换成 `download_url`
- `getTask()`：POST 查询 taskId，并把 `results[].url` 解析为结果图
- 若未配置 `NANO_BANANA_API_KEY`，会直接报明确错误

## 已确认的查询 / 响应字段语义

用户提供的真实查询响应示例：

```json
{
  "taskId": "2013508786110730241",
  "status": "RUNNING",
  "errorCode": "",
  "errorMessage": "",
  "results": null,
  "clientId": "f828b9af25161bc066ef152db7b29ccc",
  "promptTips": ""
}
```

用户提供的真实成功态查询响应示例：

```json
{
  "taskId": "2013508786110730241",
  "status": "SUCCESS",
  "errorCode": "",
  "errorMessage": "",
  "failedReason": {},
  "results": [
    {
      "url": "https://nb.gettoken.cn/demo/output/ComfyUI_00001.png",
      "outputType": "png",
      "text": null
    }
  ],
  "clientId": "",
  "promptTips": ""
}
```

字段说明已确认：

- `taskId`: 任务 ID，用于后续查询任务状态
- `status`: 当前任务状态，常见状态为 `QUEUED`、`RUNNING`、`SUCCESS`、`FAILED`、`TIMEOUT`、`CANCELED`
- `errorCode`: 错误码，仅在失败时返回
- `errorMessage`: 错误具体信息
- `failedReason`: 任务失败原因对象（如有）
- `results`: 生成结果列表；未完成时通常为 `null`
- `results[].url`: 结果文件下载链接 / CDN 地址
- `results[].outputType`: 结果文件类型，如 `png` / `mp4` / `txt`
- `results[].text`: 当输出为文本时返回对应文本内容
- `clientId`: 客户端会话 ID，用于标识本次连接
- `promptTips`: 后端校验 / 调试信息

## 已确认的 webhook 回调约定（可选）

用户提供的真实 webhook 信息：

- 提交任务时可带 `webhookUrl`
- 终态后服务端会对该 URL 发起 `POST`
- 回调 Header：
  - `Content-Type: application/json`
  - `X-Task-Id: <taskId>`
  - 若配置了签名密钥，还会带 `X-Callback-Signature: sha256=<hex>`

用户提供的 webhook 响应示例：

```json
{
  "taskId": "2013508786110730241",
  "status": "SUCCESS",
  "errorCode": "",
  "errorMessage": "",
  "results": [
    {
      "url": "https://nb.gettoken.cn/demo/output/veo31_00001.mp4",
      "outputType": "mp4",
      "text": null
    }
  ],
  "clientId": "f828b9af25161bc066ef152db7b29ccc",
  "promptTips": "",
  "model": "google/veo-3.1-fast",
  "metadata": {},
  "finishedAt": "2026-03-17T10:21:30Z"
}
```

这说明 webhook 终态包相对 query 结果，可能额外带：

- `model`
- `metadata`
- `finishedAt`

## 图生图请求字段说明（已由用户提供真实 curl / 截图确认）

`POST /openapi/v1/banana_pro/image-to-image`

必填 / 可选：

- `prompt`: 必填，图像编辑提示词
- `imageUrls`: 必填，`List<String>`，最多支持 10 项；每张可传公共 URL 或可访问下载链接
- `aspectRatio`: 可选，枚举值包括 `1:1`、`16:9`、`9:16`、`4:3`、`3:4`、`3:2`、`2:3`、`5:4`、`4:5`、`21:9`；不传则自适应图片尺寸
- `resolution`: 可选，枚举值包括 `1k`、`2k`、`4k`、`1K`、`2K`、`4K`；非必填，未传默认 `1k`，建议显式传入
- `webhookUrl`: 可选，任务终态后回调 URL
- `clientTaskId`: 可选，业务幂等键 / 外部传入的任务标识，未传则自动生成

补充限制：

- 文档说明当前 wudi-api 网关单次 JSON 请求体上限约 10MB
- 该限制是整包限制，不只是 `imageUrls`，还包括 `prompt` 与其它 JSON 字段


用户提供的文档截图进一步确认：

- 资源文件（如 `imageUrls`）参数支持传入：
  - 公共可访问的文件 URL
  - Base64 Data URI
- 当前文档对应的 wudi-api 网关对单次 JSON 请求体限制约为 `10MB`
- 这个 `10MB` 是总请求体限制，不只是图片字段，包含：
  - `imageUrls`
  - `prompt`
  - 其它 JSON 字段

### 公共 URL 示例

```json
{
  "imageUrls": [
    "https://nb.gettoken.cn/image.png"
  ]
}
```

### Base64 Data URI 示例

```json
{
  "imageUrls": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  ]
}
```

### GetToken 上传接口

上传本地文件以换取可公开访问的 URL：

```bash
curl --location --request POST 'https://nb.gettoken.cn/openapi/v1/media/upload/binary' \
--header "Authorization: Bearer ${API_SERVICE_API_KEY}" \
--form "file=@/path/to/image.png"
```

标准成功响应结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "image",
    "download_url": "https://nb.gettoken.cn/openapi/xxxx.png",
    "fileName": "openapi/xxxx.png",
    "size": "3490"
  }
}
```

字段说明：

- `code`: 接口状态码，`0` 表示成功
- `message`: 接口消息，一般为 `success`
- `data.type`: 文件类型，如 `image`
- `data.download_url`: 上传后可直接访问的公共 URL
- `data.fileName`: 服务端保存路径 / 文件名
- `data.size`: 文件大小

## 当前项目里的落地含义

- 当前已跑通的文生图 provider 本身不消费 `imageUrls`
- 但本地上传桥 `lib/providers/gettoken-upload.ts` 仍然有价值：
  - 后续图生图 / 多参考图接口很可能直接复用 `imageUrls`
  - 届时可以把本地 `/uploads/...` 文件先上传到 GetToken，再把返回的 `download_url` 填进 `imageUrls`
- 如果后续直接走 Base64 Data URI，也要注意整包 JSON 10MB 限制，别把大图硬塞爆了

## 已确认的结论

- 之前使用 `/openapi/v1/submit` 之所以 404，是因为真实文生图 submit 路径应为 `/openapi/v1/banana_pro/text-to-image`
- GetToken 上传接口本身已实测成功，且文档已明确其标准成功返回结构
- 当前这条文生图接口示例不包含 `imageUrls`，因此文生图 provider 现阶段按真实 curl 示例收口，不再强塞参考图字段

## 下一步可继续确认的点

- 图生图 / 多参考图版本的真实 submit 路径与 body
- `resolution` 可选值全集
- 是否存在单独的 `seed` / `negativePrompt` / `numImages` 等字段
- webhook 回调签名密钥的配置方式与验签流程
