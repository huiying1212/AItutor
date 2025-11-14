# StepFun 快速启动指南

> 🚀 5 分钟快速配置和启动 StepFun 实时语音 AI 助教系统

## ⚡ 快速启动步骤

### 1️⃣ 获取 API Key（2 分钟）

访问 [阶跃星辰开放平台](https://platform.stepfun.com/)
- 注册/登录账号
- 在控制台获取 API Key
- 复制您的 API Key

### 2️⃣ 配置环境变量（1 分钟）

在项目根目录创建 `.env.local` 文件：

```bash
# Windows PowerShell
New-Item -Path .env.local -ItemType File
notepad .env.local
```

添加以下内容：

```env
STEPFUN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_USE_WS_PROXY=true
NEXT_PUBLIC_WS_PROXY_URL=ws://localhost:8080
```

> 将 `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 替换为您的实际 API Key

### 3️⃣ 确认配置（30 秒）

检查 `lib/constants.ts` 文件，确认以下设置：

```typescript
export const ACTIVE_PROVIDER = "stepfun" as AIProvider;
```

> ✅ 如果已经是 `"stepfun"`，无需修改

### 4️⃣ 启动服务（1 分钟）

打开 **三个终端窗口**，分别运行：

#### 终端 1 - 知识检索 API
```bash
python scripts/knowledge_api.py
```
✅ 看到 `Uvicorn running on http://0.0.0.0:8000` 表示成功

#### 终端 2 - WebSocket 代理
```bash
npm run ws-proxy
```
✅ 看到 `Listening on: ws://localhost:8080` 表示成功

#### 终端 3 - Next.js 开发服务器
```bash
npm run dev
```
✅ 看到 `Local: http://localhost:3000` 表示成功

### 5️⃣ 开始使用（30 秒）

1. 打开浏览器访问 http://localhost:3000
2. 点击 **"连接"** 按钮
3. 允许浏览器使用麦克风
4. 点击 **麦克风** 按钮并开始说话
5. 享受与 AI 助教的对话！

## 🎯 验证成功的标志

### 浏览器控制台输出
```
Requesting session from STEPFUN Realtime API...
Using model: step-audio-2-mini
StepFun session info prepared: stepfun-session-xxx
Connecting to stepfun via proxy: ws://localhost:8080?...
StepFun WebSocket connected
Session configuration sent
```

### WebSocket 代理输出
```
[时间戳] New client connection
  Provider: stepfun
  Model: step-audio-2-mini
  API Key: ***xxxx
  Connecting to StepFun: wss://api.stepfun.com/v1/realtime?model=step-audio-2-mini
  Connected to StepFun successfully
```

## 🎤 试试这些问题

连接成功后，您可以尝试：

1. **简单问候**
   - "你好"
   - "介绍一下你自己"

2. **设计历史问题**
   - "什么是包豪斯设计？"
   - "介绍一下后现代主义设计"
   - "设计历史的主要阶段"

3. **知识检索测试**
   - "搜索关于工艺美术运动的信息"（会触发知识检索）
   - "显示设计历史的时间线"（会显示白板内容）

## ⚠️ 常见问题快速解决

### 问题：连接失败

**检查清单：**
```bash
# 1. 验证 API Key
cat .env.local | findstr STEPFUN_API_KEY

# 2. 检查 WebSocket 代理是否运行
# 应该看到终端 2 有输出

# 3. 检查 Next.js 服务器是否运行
# 应该看到终端 3 有输出
```

**解决方案：**
- 确保 `.env.local` 文件在项目根目录
- 重启所有三个服务
- 刷新浏览器页面

### 问题：没有声音

**检查清单：**
- ✅ 浏览器已允许麦克风权限
- ✅ 浏览器已允许音频播放
- ✅ 系统音量未静音
- ✅ 查看浏览器控制台是否有错误

### 问题：麦克风无响应

**解决方案：**
1. 检查浏览器设置 → 隐私和安全 → 网站设置 → 麦克风
2. 确保 localhost:3000 已被允许使用麦克风
3. 尝试刷新页面并重新授权

## 📊 快速性能测试

1. 说话后等待响应
2. 记录从停止说话到听到 AI 回复的时间

**预期性能：**
- ⚡ 响应时间：1-3 秒
- 🎙️ 语音质量：清晰自然
- 📝 内容显示：实时更新

## 🔄 切换到其他提供商

如果想切换回阿里云或 OpenAI：

```typescript
// lib/constants.ts
export const ACTIVE_PROVIDER = "aliyun" as AIProvider;  // 阿里云
// 或
export const ACTIVE_PROVIDER = "openai" as AIProvider;  // OpenAI
```

然后重启所有服务。

## 📚 进一步学习

- 📖 [完整配置指南](STEPFUN_SETUP.md)
- 🧪 [测试指南](PROVIDER_TEST_GUIDE.md)
- 📋 [更新日志](CHANGELOG_STEPFUN.md)
- 📘 [项目 README](README.md)

## 🎉 成功！

如果您看到上述成功标志，恭喜您已经成功配置并启动了 StepFun AI 助教系统！

现在您可以：
- 🗣️ 与 AI 进行自然对话
- 📚 获取知识库支持的详细解答
- 📊 在白板上查看可视化内容
- 🎨 探索设计历史知识

享受智能助教带来的学习体验！ 🚀

