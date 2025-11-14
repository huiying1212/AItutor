# StepFun (阶跃星辰) Realtime API 配置指南

本指南介绍如何配置和使用 StepFun（阶跃星辰）的实时语音 API。

## 📚 API 文档

- **官方文档**: [https://platform.stepfun.com/docs/api-reference/realtime/chat](https://platform.stepfun.com/docs/api-reference/realtime/chat)
- **开放平台**: [https://platform.stepfun.com/](https://platform.stepfun.com/)

## 🔧 配置步骤

### 1. 获取 API Key

1. 访问 [阶跃星辰开放平台](https://platform.stepfun.com/)
2. 注册账号并登录
3. 在控制台获取您的 API Key

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件（如果还不存在），添加以下内容：

```env
# StepFun API Key
STEPFUN_API_KEY=your_stepfun_api_key_here

# WebSocket 代理配置（开发环境）
NEXT_PUBLIC_USE_WS_PROXY=true
NEXT_PUBLIC_WS_PROXY_URL=ws://localhost:8080
```

### 3. 切换到 StepFun 提供商

在 `lib/constants.ts` 文件中，确保 `ACTIVE_PROVIDER` 设置为 `"stepfun"`:

```typescript
export const ACTIVE_PROVIDER = "stepfun" as AIProvider;
```

### 4. 启动服务

需要启动三个服务：

#### 终端 1: 知识检索 API

```bash
python scripts/knowledge_api.py
```

#### 终端 2: WebSocket 代理

```bash
npm run ws-proxy
```

> **重要**: StepFun 的 WebSocket API 需要在握手时添加 `Authorization` 头，而浏览器 WebSocket API 不支持这一功能。因此必须使用 WebSocket 代理服务器。

#### 终端 3: Next.js 开发服务器

```bash
npm run dev
```

### 5. 访问应用

在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 🎯 支持的模型

StepFun 提供以下实时语音模型：

- `step-1o-audio` - 标准实时语音模型
- `step-audio-2` - 第二代实时语音模型
- `step-audio-2-mini` - 轻量级实时语音模型（当前使用）

### 切换模型

在 `lib/constants.ts` 中修改 `STEPFUN_CONFIG`:

```typescript
export const STEPFUN_CONFIG = {
  model: "step-audio-2-mini", // 或 "step-1o-audio", "step-audio-2"
  baseUrl: "wss://api.stepfun.com/v1/realtime",
  sessionUrl: null,
  voice: "coral"
} as const;
```

## 🔊 语音选项

StepFun 支持的语音选项：
- `coral` (当前使用)

## 🔄 从其他提供商切换

### 从阿里云切换

如果之前使用阿里云，只需：

1. 添加 `STEPFUN_API_KEY` 到 `.env.local`
2. 在 `lib/constants.ts` 中改变 `ACTIVE_PROVIDER` 为 `"stepfun"`
3. 重启服务

WebSocket 代理服务器会自动根据 `provider` 参数路由到正确的端点。

### 切换回阿里云

将 `ACTIVE_PROVIDER` 改回 `"aliyun"` 即可。

## 🛠️ WebSocket 代理说明

### 为什么需要代理？

浏览器的 WebSocket API 不支持在握手时添加自定义 HTTP 头（如 `Authorization`），但 StepFun API 需要这个头进行身份验证。WebSocket 代理服务器解决了这个问题：

1. 浏览器连接到本地代理服务器（`ws://localhost:8080`）
2. 代理服务器添加 `Authorization` 头
3. 代理服务器转发所有消息到 StepFun 服务器

### 代理服务器配置

代理服务器位于 `websocket-proxy.js`，支持多个提供商：
- StepFun
- 阿里云 DashScope
- 更多提供商可以轻松添加

### 连接参数

代理服务器通过 URL 查询参数接收配置：

```
ws://localhost:8080?model=MODEL_NAME&apiKey=API_KEY&provider=PROVIDER_NAME
```

参数说明：
- `model`: 模型名称（如 `step-audio-2-mini`）
- `apiKey`: API 密钥
- `provider`: 提供商名称（`stepfun`, `aliyun`, 等）
- `workspace`: （可选）工作空间 ID（仅阿里云）

## 📝 API 事件类型

### Client Events (客户端发送)

- `session.update` - 创建/更新会话
- `input_audio_buffer.append` - 追加音频数据
- `input_audio_buffer.commit` - 提交音频输入
- `input_audio_buffer.clear` - 清空音频缓冲区
- `conversation.item.create` - 添加会话消息
- `conversation.item.delete` - 删除会话消息
- `response.create` - 提交推理请求
- `response.cancel` - 取消推理

### Server Events (服务器返回)

- `error` - 错误事件
- `session.created` - 会话创建响应
- `session.updated` - 会话更新响应
- `input_audio_buffer.speech_started` - VAD 检测到语音开始
- `input_audio_buffer.speech_stopped` - VAD 检测到语音结束
- `response.audio.delta` - 音频内容流式返回
- `response.audio.done` - 音频内容流式结束
- `response.audio_transcript.delta` - 音频转录文字流
- `response.audio_transcript.done` - 音频转录完成
- `response.done` - 推理结束

## 🔍 调试

### 查看 WebSocket 消息

WebSocket 代理服务器会记录所有消息：

```bash
npm run ws-proxy
```

日志格式：
```
[时间戳] New client connection
  Provider: stepfun
  Model: step-audio-2-mini
  API Key: ***xxxx
  Connecting to StepFun: wss://api.stepfun.com/v1/realtime?model=step-audio-2-mini
  Connected to StepFun successfully
  Client -> StepFun: session.update
  StepFun -> Client: session.updated
  ...
```

### 常见问题

#### 1. 连接失败

**问题**: WebSocket 连接失败
**解决方案**:
- 检查 `STEPFUN_API_KEY` 是否正确设置
- 确保 WebSocket 代理服务器正在运行
- 检查网络连接

#### 2. 没有音频输出

**问题**: 连接成功但听不到声音
**解决方案**:
- 检查浏览器音频权限
- 确保使用的是支持的音频格式（PCM16）
- 查看浏览器控制台错误信息

#### 3. API Key 错误

**问题**: 401 Unauthorized 错误
**解决方案**:
- 确认 API Key 有效且未过期
- 检查 `.env.local` 文件中的 API Key 是否正确
- 重启开发服务器以加载新的环境变量

## 📊 配置对比

| 特性 | StepFun | 阿里云 | OpenAI |
|------|---------|--------|--------|
| WebSocket 代理 | ✅ 需要 | ✅ 需要 | ❌ 不需要 |
| 中文支持 | ✅ 优秀 | ✅ 优秀 | ⚠️ 一般 |
| 响应速度 | ⚡ 快速 | ⚡ 快速 | 🔵 中等 |
| API 文档 | 📚 完整 | 📚 完整 | 📚 完整 |
| 成本 | 💰 经济 | 💰 经济 | 💰💰 较高 |

## 🔗 相关链接

- [StepFun 开放平台](https://platform.stepfun.com/)
- [Realtime API 文档](https://platform.stepfun.com/docs/api-reference/realtime/chat)
- [模型能力总览](https://platform.stepfun.com/docs/model-overview)
- [定价计费](https://platform.stepfun.com/docs/pricing)

## 📄 许可证

本配置遵循项目的 MIT 许可证。使用 StepFun API 需遵守其服务条款。

