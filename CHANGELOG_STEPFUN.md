# StepFun 集成更新日志

## 📅 更新日期: 2025-11-14

## 🎯 更新目标

将 AI Intelligent Tutor 系统集成 StepFun（阶跃星辰）的实时语音 API，并使用 `step-audio-2-mini` 模型。

## ✅ 完成的更改

### 1. 核心配置文件

#### `lib/constants.ts`
- ✅ 添加 `AIProvider` 类型支持 `"stepfun"`
- ✅ 新增 `STEPFUN_CONFIG` 配置对象
  ```typescript
  export const STEPFUN_CONFIG = {
    model: "step-audio-2-mini",
    baseUrl: "wss://api.stepfun.com/v1/realtime",
    sessionUrl: null,
    voice: "coral"
  } as const;
  ```
- ✅ 将 `ACTIVE_PROVIDER` 设置为 `"stepfun"`
- ✅ 更新 `getCurrentConfig()` 函数支持 StepFun

### 2. API 路由

#### `app/api/session/route.ts`
- ✅ 导入 `STEPFUN_CONFIG`
- ✅ 添加 `createStepFunSession()` 函数
- ✅ 在主路由中添加 StepFun 分支处理
- ✅ 使用环境变量 `STEPFUN_API_KEY` 进行认证

### 3. WebSocket 代理服务器

#### `websocket-proxy.js`
- ✅ 重构为支持多提供商的通用代理
- ✅ 添加 `PROVIDERS` 配置对象，包含：
  - `aliyun`: 阿里云 DashScope
  - `stepfun`: StepFun 阶跃星辰
- ✅ 支持通过 URL 参数 `provider` 动态选择提供商
- ✅ 更新日志输出显示当前使用的提供商
- ✅ 将所有硬编码的提供商名称改为动态引用

### 4. 前端组件

#### `components/app.tsx`
- ✅ 更新 WebSocket 连接 URL，添加 `provider` 参数
- ✅ 更新日志输出使用 `ACTIVE_PROVIDER` 变量
- ✅ 保持与所有提供商的兼容性

### 5. 文档更新

#### `README.md`
- ✅ 在"AI 模型支持"部分添加 StepFun
- ✅ 更新技术栈说明
- ✅ 更新环境配置部分，添加 StepFun 配置说明
- ✅ 更新 WebSocket 代理说明，包含 StepFun
- ✅ 更新完整启动流程文档
- ✅ 更新核心组件说明

#### 新增文档
- ✅ `STEPFUN_SETUP.md` - StepFun 完整配置指南
  - API 文档链接
  - 配置步骤
  - 支持的模型
  - 语音选项
  - 切换指南
  - WebSocket 代理说明
  - API 事件类型
  - 调试指南
  - 配置对比表

- ✅ `PROVIDER_TEST_GUIDE.md` - 提供商测试指南
  - 配置检查清单
  - 测试步骤
  - 故障排除
  - 性能测试
  - 切换提供商指南
  - 测试日志模板

## 🔧 技术实现细节

### WebSocket 连接流程

1. **客户端连接**:
   ```
   Browser → ws://localhost:8080?model=step-audio-2-mini&apiKey=xxx&provider=stepfun
   ```

2. **代理服务器处理**:
   - 解析 URL 参数
   - 识别提供商（stepfun）
   - 获取提供商配置
   - 构建目标 WebSocket URL
   - 添加 Authorization 头

3. **转发到 StepFun**:
   ```
   Proxy → wss://api.stepfun.com/v1/realtime?model=step-audio-2-mini
   Headers: { Authorization: "Bearer xxx" }
   ```

4. **双向消息转发**:
   - 客户端 ↔ 代理 ↔ StepFun
   - 保持消息格式不变
   - 记录所有消息用于调试

### Session 管理

StepFun 的 session 管理类似于阿里云：
- 不使用 REST API 创建 session
- 直接通过 WebSocket 建立连接
- 使用 `session.update` 事件配置会话
- API Key 通过 Authorization 头传递

### 音频格式

- **输入格式**: PCM16, 16kHz, 单声道
- **输出格式**: PCM16, 24kHz, 单声道
- 与阿里云配置保持一致

## 🔄 兼容性保证

### 向后兼容
- ✅ 保留所有现有的 OpenAI 配置
- ✅ 保留所有现有的阿里云配置
- ✅ WebSocket 代理支持旧的连接方式（默认 provider=aliyun）
- ✅ 现有环境变量继续有效

### 切换机制
用户可以轻松切换提供商：
1. 修改 `lib/constants.ts` 中的 `ACTIVE_PROVIDER`
2. 确保相应的 API Key 已设置
3. 重启服务

## 📋 环境变量

### 新增变量
```env
# StepFun API Key
STEPFUN_API_KEY=your_stepfun_api_key_here
```

### 保留变量
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Aliyun
DASHSCOPE_API_KEY=your_dashscope_api_key_here
DASHSCOPE_WORKSPACE=your_workspace_id_here

# WebSocket Proxy
NEXT_PUBLIC_USE_WS_PROXY=true
NEXT_PUBLIC_WS_PROXY_URL=ws://localhost:8080
```

## 🧪 测试验证

### 测试场景
1. ✅ StepFun 连接建立
2. ✅ Session 配置发送
3. ✅ 语音输入处理
4. ✅ 音频输出播放
5. ✅ Tool Call 执行（display_content, search_knowledge）
6. ✅ WebSocket 消息转发
7. ✅ 错误处理

### 测试结果
所有核心功能已验证配置正确。

## 📊 支持的模型对比

| 提供商 | 模型 | 中文支持 | 响应速度 | WebSocket 代理 |
|--------|------|----------|----------|----------------|
| StepFun | step-audio-2-mini | ✅ 优秀 | ⚡ 快速 | ✅ 需要 |
| 阿里云 | qwen3-omni-flash-realtime | ✅ 优秀 | ⚡ 快速 | ✅ 需要 |
| OpenAI | gpt-realtime-mini | ⚠️ 一般 | 🔵 中等 | ❌ 不需要 |

## 🎯 StepFun 特定配置

### 支持的模型
- `step-1o-audio` - 标准模型
- `step-audio-2` - 第二代模型
- `step-audio-2-mini` - 轻量级模型（当前使用）

### 语音选项
- `coral` (默认)

### API 端点
- WebSocket: `wss://api.stepfun.com/v1/realtime`
- 文档: https://platform.stepfun.com/docs/api-reference/realtime/chat

## 🚀 启动服务

### 完整启动命令（StepFun）

```bash
# 终端 1: 知识检索 API
python scripts/knowledge_api.py

# 终端 2: WebSocket 代理
npm run ws-proxy

# 终端 3: Next.js 开发服务器
npm run dev
```

### 验证连接

1. 访问 http://localhost:3000
2. 点击"连接"按钮
3. 查看控制台输出：
   ```
   Requesting session from STEPFUN Realtime API...
   Using model: step-audio-2-mini
   Connecting to stepfun via proxy: ws://localhost:8080?...
   StepFun WebSocket connected
   ```

## 📝 API 事件支持

### Client Events（客户端发送）
- ✅ `session.update` - 配置会话
- ✅ `input_audio_buffer.append` - 发送音频
- ✅ `input_audio_buffer.commit` - 提交音频
- ✅ `response.create` - 请求响应
- ✅ `response.cancel` - 取消响应

### Server Events（服务器返回）
- ✅ `session.created` - 会话创建
- ✅ `session.updated` - 会话更新
- ✅ `response.audio.delta` - 音频数据流
- ✅ `response.audio.done` - 音频完成
- ✅ `response.done` - 响应完成
- ✅ `error` - 错误事件

## 🔍 调试功能

### WebSocket 代理日志
代理服务器会详细记录：
- 连接建立
- 提供商选择
- 消息类型
- 数据大小
- 错误信息

示例输出：
```
[2025-11-14T...] New client connection
  Provider: stepfun
  Model: step-audio-2-mini
  API Key: ***xxxx
  Connecting to StepFun: wss://api.stepfun.com/v1/realtime?model=step-audio-2-mini
  Connected to StepFun successfully
  Client -> StepFun: session.update
  StepFun -> Client: session.updated
```

## ⚠️ 已知限制

1. **WebSocket 代理必需**: StepFun 需要 WebSocket 代理，因为浏览器 WebSocket API 不支持自定义握手头
2. **语音选项**: 当前仅支持 `coral` 语音
3. **网络要求**: 需要稳定的网络连接到 StepFun 服务器

## 🔜 未来改进

- [ ] 添加更多 StepFun 语音选项支持
- [ ] 优化音频缓冲策略
- [ ] 添加重连机制
- [ ] 支持更多 StepFun 模型
- [ ] 添加音频质量配置选项

## 📞 参考资源

- [StepFun 开放平台](https://platform.stepfun.com/)
- [Realtime API 文档](https://platform.stepfun.com/docs/api-reference/realtime/chat)
- [项目 README](README.md)
- [StepFun 配置指南](STEPFUN_SETUP.md)
- [测试指南](PROVIDER_TEST_GUIDE.md)

## 👥 贡献者

本次更新实现了完整的 StepFun 集成，包括：
- 核心配置
- API 路由
- WebSocket 代理
- 文档更新
- 测试验证

## 📄 许可证

本项目遵循 MIT 许可证。使用 StepFun API 需遵守其服务条款。

