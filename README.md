---
title: AI Tutor
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.0.0
app_file: app.py
pinned: false
---
# 智能助教系统 - AI Intelligent Tutor

基于OpenAI Realtime API的智能助教系统，通过语音交互和智能白板为学生提供个性化的学习体验，并集成了多模态知识检索系统，支持文本和图片的语义搜索。

## 系统特性

### 智能助教功能
- **实时语音交互**: 支持自然语言语音对话，学生可以直接提问
- **智能白板**: 实时展示教学内容，包括文本、图表、列表等多种形式
- **多媒体展示**: 支持条形图、饼图、折线图等数据可视化
- **同步教学**: 语音讲解与视觉展示同步进行，提升学习效果
- **自适应内容**: 根据学生问题动态生成教学内容

### 多模态知识检索功能
- 🔍 **多模态搜索**: 支持文本到文本、文本到图片、图片到图片的跨模态检索
- 🏠 **本地化部署**: 基于本地CLIP模型
- ⚡ **高效向量检索**: 使用FAISS进行快速相似度搜索
- 🤖 **RAG支持**: 为大语言模型提供相关的上下文信息
- 🎨 **现代化界面**: 基于Next.js和React的美观用户界面

## 技术栈

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS
- **图表**: Chart.js + react-chartjs-2
- **AI**: OpenAI Realtime API
- **实时通信**: WebRTC
- **多模态模型**: CLIP (Contrastive Language-Image Pretraining)
- **向量检索**: FAISS (Facebook AI Similarity Search)
- **API服务**: FastAPI

## 项目结构

```
├── app/
│   ├── api/
│   │   ├── knowledge/        # 知识检索API
│   │   └── session/          # OpenAI会话管理API
│   ├── knowledge/            # 知识检索页面
│   ├── layout.tsx            # 应用布局
│   └── page.tsx              # 主页面
├── components/
│   ├── app.tsx               # 主应用组件
│   ├── whiteboard.tsx        # 智能白板组件
│   ├── controls.tsx          # 控制面板
│   ├── logs.tsx              # 日志显示
│   └── KnowledgeSearch.tsx   # 知识检索组件
├── lib/
│   ├── config.ts             # AI配置和工具定义
│   └── constants.ts          # 常量配置
├── models/
│   └── clip-vit-base-patch32/# 本地CLIP模型文件
├── public/
│   └── example-structuredDATA/# 知识库数据
│       ├── content2.jsonl    # 文本内容（JSONL格式）
│       ├── image2.json       # 图片元数据
│       └── images/           # 图片文件
├── scripts/
│   ├── build_vector_database.py  # 构建向量数据库
│   ├── search_knowledge.py       # 知识检索模块
│   ├── knowledge_api.py          # FastAPI服务器
│   └── setup.py                  # 环境检查脚本
├── vector_database/              # 向量数据库存储目录
└── requirements.txt              # Python依赖
```

## 安装和设置

### 1. 安装依赖

```bash
# 安装Node.js依赖
npm install

# 安装Python依赖
pip install -r requirements.txt
```

### 2. 环境配置

创建 `.env` 文件并添加 OpenAI API 密钥：

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 环境检查

运行设置脚本检查环境：

```bash
python scripts/setup.py
```

### 4. 构建向量数据库

```bash
python scripts/build_vector_database.py
```

这将：
- 加载本地CLIP模型
- 处理文本数据，分割为语义片段
- 为所有图片生成向量嵌入
- 创建FAISS索引用于快速检索
- 保存向量数据库到 `vector_database/` 目录

### 5. 启动API服务器

```bash
python scripts/knowledge_api.py
```

API服务器将在 `http://localhost:8000` 启动。

### 6. 运行开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 使用方法

### 智能助教界面

1. **连接会话**: 点击"连接"按钮启动AI助教会话
2. **语音交互**: 点击麦克风按钮开始说话，向AI助教提问
3. **查看白板**: AI助教会在白板上实时展示相关教学内容
4. **持续学习**: 可以继续提问，AI会根据问题更新白板内容

### 知识检索界面

访问 `http://localhost:3000/knowledge` 使用知识检索界面。

1. **文本搜索**: 输入关键词搜索相关的文本内容和图片
2. **图片搜索**: 上传图片找到相似的图片和相关文本
3. **多模态搜索**: 综合文本和图片结果
4. **RAG上下文**: 生成用于大语言模型的上下文信息

### API接口

#### 文本搜索
```bash
curl -X POST "http://localhost:8000/search/text" \
     -H "Content-Type: application/json" \
     -d '{"query": "设计历史", "mode": "multimodal", "top_k": 5}'
```

#### 图片搜索
```bash
curl -X POST "http://localhost:8000/search/image" \
     -F "file=@image.jpg" \
     -F "top_k=5"
```

#### RAG上下文生成
```bash
curl -X POST "http://localhost:8000/rag/generate" \
     -H "Content-Type: application/json" \
     -d '{"query": "后现代主义设计", "mode": "rag"}'
```

## 单独使用多模态知识检索系统

如果您只需要使用多模态知识检索功能而不需要完整的智能助教系统，可以按照以下步骤操作：

### 安装与配置

1. **安装Python依赖**
   ```bash
   pip install -r requirements.txt
   ```

2. **下载CLIP模型**
   > ⚠️ **重要提示**: 由于模型文件较大，Git仓库中不包含CLIP模型文件。您需要手动下载并放置模型文件。
   
   a. 从Hugging Face下载CLIP模型(clip-vit-base-patch32)
   ```bash
   # 安装huggingface_hub工具
   pip install huggingface_hub
   
   # 下载模型到models目录
   python -c "from huggingface_hub import snapshot_download; snapshot_download('openai/clip-vit-base-patch32', local_dir='./models/clip-vit-base-patch32')"
   ```
   
   b. 或者手动下载并解压到`models/clip-vit-base-patch32`目录，确保包含以下文件：
      - config.json
      - pytorch_model.bin 或 model.safetensors
      - tokenizer.json
      - preprocessor_config.json
      - vocab.json
      - merges.txt

3. **准备知识库数据**
   - 将文本内容保存在 `public/example-structuredDATA/content2.jsonl`（JSONL格式，每行一个JSON对象）
   - 将图片元数据保存在 `public/example-structuredDATA/image2.json`
   - 将图片文件放在 `public/example-structuredDATA/images/` 目录

4. **构建向量数据库**
   ```bash
   python scripts/build_vector_database.py
   ```

5. **仅启动知识检索API**
   ```bash
   python scripts/knowledge_api.py
   ```
   这将在 `http://localhost:8000` 启动API服务器

### 使用方式

#### 方式一：通过Web界面

1. 启动Next.js服务器
   ```bash
   npm run dev
   ```

2. 访问知识检索页面
   ```
   http://localhost:3000/knowledge
   ```

3. 使用界面进行文本搜索、图片搜索或生成RAG上下文

#### 方式二：直接使用Python脚本

```bash
# 文本搜索
python scripts/search_knowledge.py --query "设计历史" --mode multimodal

# 保存搜索结果
python scripts/search_knowledge.py --query "包豪斯" --mode rag --output results.json
```

#### 方式三：通过API接口

可以直接调用API接口进行搜索，适合集成到其他应用中：

```bash
# 文本搜索
curl -X POST "http://localhost:8000/search/text" \
     -H "Content-Type: application/json" \
     -d '{"query": "设计历史", "mode": "multimodal", "top_k": 5}'

# 图片搜索
curl -X POST "http://localhost:8000/search/image" \
     -F "file=@image.jpg" \
     -F "top_k=5"
```

### 自定义知识库

1. **准备自定义数据**
   - 创建内容JSONL文件，格式参考 `example-structuredDATA/content2.jsonl`（支持JSONL或JSON格式）
   - 创建图片元数据JSON文件，格式参考 `example-structuredDATA/image2.json`
   - 准备图片文件

2. **构建自定义向量数据库**
   ```bash
   python scripts/build_vector_database.py --data_dir /path/to/your/data --output_dir /path/to/output
   ```

3. **使用自定义数据库进行搜索**
   ```bash
   python scripts/knowledge_api.py --vector_db_path /path/to/output
   ```

### 配置选项

知识检索系统提供多种配置选项，可通过命令行参数调整：

- `--top_k`: 返回结果数量（默认：5）
- `--min_score`: 最小相似度阈值（默认：0.3）
- `--text_weight`: 文本结果权重（默认：0.6）
- `--image_weight`: 图片结果权重（默认：0.4）

## 白板功能

- **文本展示**: 显示概念解释、定义等文本内容
- **列表展示**: 展示要点、步骤等结构化信息
- **图表展示**: 
  - 条形图：用于数据对比
  - 饼图：用于比例分布
  - 折线图：用于趋势展示
- **内容高亮**: 突出显示重要概念
- **清空白板**: 切换话题时自动清理内容

## 技术架构

### 核心组件

1. **OpenAI Realtime API**: 提供实时语音交互和AI助教功能
2. **CLIP模型**: 多模态编码器，将文本和图片映射到同一向量空间
3. **FAISS**: 高效的向量相似度搜索库
4. **FastAPI**: 提供RESTful API接口
5. **React**: 现代化的用户界面

### 数据流程

```
输入查询 → CLIP编码 → FAISS检索 → 结果排序 → 返回相关内容 → AI助教利用知识回答
```

## 开发指南

### 添加新的白板内容类型

1. 在 `components/whiteboard.tsx` 中添加新的内容渲染逻辑
2. 在 `lib/config.ts` 中更新工具定义
3. 在AI指令中添加相应的使用说明

### 自定义AI行为

修改 `lib/config.ts` 中的 `INSTRUCTIONS` 常量来调整AI助教的行为和教学风格。

### 添加新的知识库

1. 准备数据文件（content2.jsonl, image2.json）
2. 将图片文件放在images目录
3. 重新构建向量数据库

## 性能优化

### 硬件建议

- **GPU**: 建议使用支持CUDA的GPU加速模型推理
- **内存**: 至少8GB RAM用于加载模型和数据
- **存储**: SSD硬盘提高数据读取速度

### 优化技巧

1. **批处理**: 调整batch_size参数平衡内存使用和速度
2. **缓存**: API服务器会缓存模型，避免重复加载
3. **并行处理**: 多进程处理大量数据时提高效率

## 故障排除

### 常见问题

1. **模型加载失败**
   - 检查CLIP模型文件是否完整
   - 确认模型路径正确
   - 如果从Git仓库克隆后出现此问题，请确保已按照[安装与配置](#安装与配置)中的步骤2下载CLIP模型文件
   - 模型下载失败时，可尝试直接从[Hugging Face](https://huggingface.co/openai/clip-vit-base-patch32)手动下载

2. **FAISS索引错误**
   - 确保有足够的磁盘空间
   - 检查向量维度是否匹配

3. **API连接失败**
   - 确认API服务器正在运行
   - 检查端口是否被占用

4. **搜索结果为空**
   - 降低相似度阈值
   - 检查知识库数据是否正确加载

## 部署

```bash
npm run build
npm start
```

## 相关项目

- [OpenAI CLIP](https://github.com/openai/CLIP)
- [Hugging Face Transformers](https://github.com/huggingface/transformers)
- [FAISS](https://github.com/facebookresearch/faiss)
- [FastAPI](https://fastapi.tiangolo.com/)

## 许可证

MIT License

**注意**: 此系统设计用于教育和研究目的，请确保遵循相关的数据使用政策和版权法规。
