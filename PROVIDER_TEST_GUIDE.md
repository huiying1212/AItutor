# AI 提供商配置测试指南

本指南帮助您验证 AI 提供商（OpenAI、阿里云、StepFun）的配置是否正确。

## 🎯 当前配置检查

### 1. 查看当前激活的提供商

打开 `lib/constants.ts` 文件，找到以下行：

```typescript
export const ACTIVE_PROVIDER = "stepfun" as AIProvider; // 当前设置
```

可选值：
- `"openai"` - OpenAI GPT Realtime
- `"aliyun"` - 阿里云 Qwen-Omni-Realtime
- `"stepfun"` - StepFun step-audio-2-mini

## 📋 配置检查清单

### StepFun 配置

- [ ] `.env.local` 中设置 `STEPFUN_API_KEY`
- [ ] `lib/constants.ts` 中 `ACTIVE_PROVIDER` 设为 `"stepfun"`
- [ ] WebSocket 代理服务器正在运行（`npm run ws-proxy`）
- [ ] 知识检索 API 正在运行（`python scripts/knowledge_api.py`）
- [ ] Next.js 开发服务器正在运行（`npm run dev`）

### 阿里云配置

- [ ] `.env.local` 中设置 `DASHSCOPE_API_KEY`
- [ ] `lib/constants.ts` 中 `ACTIVE_PROVIDER` 设为 `"aliyun"`
- [ ] WebSocket 代理服务器正在运行（`npm run ws-proxy`）
- [ ] 知识检索 API 正在运行（`python scripts/knowledge_api.py`）
- [ ] Next.js 开发服务器正在运行（`npm run dev`）

### OpenAI 配置

- [ ] `.env.local` 中设置 `OPENAI_API_KEY`
- [ ] `lib/constants.ts` 中 `ACTIVE_PROVIDER` 设为 `"openai"`
- [ ] 知识检索 API 正在运行（`python scripts/knowledge_api.py`）
- [ ] Next.js 开发服务器正在运行（`npm run dev`）
- [ ] ⚠️ **不需要** WebSocket 代理服务器

## 🔧 测试步骤

### 步骤 1: 检查环境变量

根据您选择的提供商，确保相应的 API Key 已设置：

```bash
# Windows PowerShell
cat .env.local

# 或在 Node.js 环境中
node -e "require('dotenv').config({ path: '.env.local' }); console.log('STEPFUN_API_KEY:', process.env.STEPFUN_API_KEY ? '已设置 (***' + process.env.STEPFUN_API_KEY.slice(-4) + ')' : '未设置');"
```

### 步骤 2: 启动必要的服务

#### 对于 StepFun 和阿里云

**终端 1** - 知识检索 API:
```bash
python scripts/knowledge_api.py
```
预期输出：
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**终端 2** - WebSocket 代理:
```bash
npm run ws-proxy
```
预期输出：
```
============================================================
WebSocket Proxy Server for AI Realtime APIs
============================================================
Listening on: ws://localhost:8080
Started at: 2025-11-14T...
Supported providers:
  - aliyun: Aliyun DashScope
  - stepfun: StepFun
...
```

**终端 3** - Next.js 开发服务器:
```bash
npm run dev
```
预期输出：
```
▲ Next.js 15.1.3
- Local:        http://localhost:3000
...
✓ Ready in ...ms
```

#### 对于 OpenAI

只需要两个终端：

**终端 1** - 知识检索 API (同上)
**终端 2** - Next.js 开发服务器 (同上)

### 步骤 3: 测试连接

1. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)
2. 打开浏览器开发者工具（F12）查看控制台
3. 点击"连接"按钮

#### 预期行为

**成功连接** - 您应该看到：
- 按钮变为"断开连接"
- 控制台显示连接成功消息
- 麦克风按钮变为可用

**StepFun 控制台输出示例**:
```
Requesting session from STEPFUN Realtime API...
Using model: step-audio-2-mini
StepFun session info prepared: stepfun-session-1731600000000
Connecting to stepfun via proxy: ws://localhost:8080?model=step-audio-2-mini&apiKey=***&provider=stepfun
StepFun WebSocket connected
Session configuration sent (StepFun format)
```

**WebSocket 代理控制台输出示例**:
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

### 步骤 4: 测试语音交互

1. 确保浏览器已授予麦克风权限
2. 点击麦克风按钮
3. 说话（例如："你好"）
4. 等待 AI 响应

#### 预期行为

- 控制台显示音频数据正在发送
- WebSocket 代理显示消息流动
- AI 开始回复（音频播放）
- 白板显示相关内容（如果 AI 调用了 display_content 工具）

## 🐛 故障排除

### 问题 1: "连接失败"

**症状**: 点击连接按钮后显示错误
**可能原因**:
1. API Key 未设置或无效
2. WebSocket 代理未运行（StepFun/阿里云）
3. 网络连接问题

**解决方案**:
```bash
# 1. 检查 API Key
cat .env.local | grep API_KEY

# 2. 重启 WebSocket 代理
npm run ws-proxy

# 3. 检查防火墙设置
```

### 问题 2: "401 Unauthorized"

**症状**: 连接失败，显示 401 错误
**可能原因**: API Key 无效或过期

**解决方案**:
1. 验证 API Key 是否正确
2. 检查 API Key 是否有权限使用相应模型
3. 确认 API Key 未过期

### 问题 3: WebSocket 代理连接失败

**症状**: 代理服务器无法连接到 AI 提供商
**可能原因**: 
1. 网络连接问题
2. API 端点地址错误
3. 防火墙阻止连接

**解决方案**:
```bash
# 测试网络连接
# StepFun
curl -I https://api.stepfun.com/

# 阿里云
curl -I https://dashscope.aliyuncs.com/

# 检查 DNS 解析
nslookup api.stepfun.com
```

### 问题 4: 没有音频输出

**症状**: 连接成功，但听不到声音
**可能原因**:
1. 浏览器音频权限未授予
2. 音频格式不支持
3. 音频上下文未正确初始化

**解决方案**:
1. 检查浏览器音频权限设置
2. 打开浏览器控制台查看错误信息
3. 尝试刷新页面重新连接

### 问题 5: 麦克风无法使用

**症状**: 无法录音或发送语音
**可能原因**:
1. 麦克风权限未授予
2. 麦克风设备未检测到
3. 音频输入上下文错误

**解决方案**:
1. 检查浏览器麦克风权限
2. 在系统设置中确认麦克风正常工作
3. 尝试使用其他浏览器

## 📊 性能测试

### 响应时间测试

测量从语音输入到 AI 响应的时间：

1. 点击麦克风按钮
2. 说一句话（例如："什么是设计历史？"）
3. 注意时间戳，从停止说话到听到响应

**预期响应时间**:
- StepFun: 1-3 秒
- 阿里云: 1-3 秒
- OpenAI: 2-5 秒

### 音频质量测试

评估语音合成质量：

1. 请 AI 解释一个复杂概念
2. 听取语音的自然度、清晰度、语调

**评估标准**:
- 发音准确性
- 语调自然度
- 语速适中
- 背景噪音水平

## 🔄 切换提供商

如果要测试不同的提供商：

1. **修改配置**:
   ```typescript
   // lib/constants.ts
   export const ACTIVE_PROVIDER = "stepfun"; // 改为 "openai" 或 "aliyun"
   ```

2. **确保相应的 API Key 已设置**:
   - StepFun: `STEPFUN_API_KEY`
   - 阿里云: `DASHSCOPE_API_KEY`
   - OpenAI: `OPENAI_API_KEY`

3. **重启服务**:
   ```bash
   # 停止所有服务 (Ctrl+C)
   
   # 重启知识检索 API
   python scripts/knowledge_api.py
   
   # 重启 WebSocket 代理（如果需要）
   npm run ws-proxy
   
   # 重启 Next.js 服务器
   npm run dev
   ```

4. **刷新浏览器页面**

## 📝 测试日志

建议记录测试结果：

```
测试日期: 2025-11-14
提供商: StepFun
模型: step-audio-2-mini

配置检查:
✅ API Key 已设置
✅ WebSocket 代理运行中
✅ 知识检索 API 运行中
✅ Next.js 服务器运行中

功能测试:
✅ 连接成功
✅ 语音输入正常
✅ AI 响应正常
✅ 音频播放正常
✅ 白板显示正常
✅ 知识检索功能正常

性能:
- 响应时间: 2.1 秒
- 音频质量: 优秀
- 连接稳定性: 稳定

问题记录:
无
```

## 🎓 最佳实践

1. **开发环境**: 始终在本地测试配置后再部署
2. **API Key 安全**: 不要将 API Key 提交到版本控制系统
3. **错误处理**: 注意查看所有三个终端的日志输出
4. **浏览器兼容性**: 推荐使用 Chrome 或 Edge 浏览器
5. **网络环境**: 确保网络连接稳定

## 📞 获取帮助

如果遇到问题：

1. 查看各服务的日志输出
2. 检查浏览器控制台错误信息
3. 参考各提供商的官方文档：
   - [StepFun 文档](https://platform.stepfun.com/docs)
   - [阿里云文档](https://help.aliyun.com/zh/model-studio/)
   - [OpenAI 文档](https://platform.openai.com/docs)
4. 查看项目 README 和相关配置指南

