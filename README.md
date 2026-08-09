# AI 公考智能训练工作台

> 纯前端 · SaaS 后台管理风格 · 组件化架构 · 可一键部署 GitHub Pages

一个面向公务员考试的 AI 智能训练工作台。顶部品牌栏 + 左侧项目导航 + 右侧动态内容区，覆盖**行测专项练习、申论智能批改、错题归因、AI 拍照解题、知识库管理、学情数据洞察、AI 备考助手**等核心场景。所有数据保存在浏览器本地（localStorage + IndexedDB），默认使用内置规则引擎模拟 AI 能力，填入任意 OpenAI 兼容接口后即可无缝切换为真实大模型，**业务代码零改动**。

## 🌐 在线演示

- **方案 A（推荐 · 国内直连）**：[AI 公考智能训练工作台 · 在线体验](https://907aaa7c33354a6ba23c82232079fcc1.bj7.agentos-app.net) —— 部署在 CloudStudio，中国大陆浏览器可直接打开。
- **方案 B（GitHub Pages）**：`https://xiaokaishuibuxing.github.io/ai-exam-workbench/` —— 需在仓库 `Settings → Pages` 中开启后访问（国内访问可能较慢）。

---

## ✨ 功能特性

| 模块 | 说明 |
| --- | --- |
| **工作台 Dashboard** | 学习概览、进度环图、今日 AI 任务、AI 能力卡片、打卡热力图 |
| **行测专项练习** | 资料分析 / 逻辑推理 / 数量关系 / 言语理解 / 常识判断 五大模块，限时训练 + 答题卡 + AI 解析 |
| **申论写作与批改** | 在线写作、草稿自动保存、AI 五维评分（要点/结构/论证/语言/规范） |
| **错题中心** | 错因聚类、AI 归因、重做、标记掌握、导出诊断报告 |
| **AI 拍照解题** | 上传/拖拽/粘贴题目图片 → OCR → 题型判断 → 答案 → 分步解析 → 相似题推荐 |
| **知识库（Notion 风格）** | 上传 PDF/Word/TXT/图片，分类筛选、全文搜索、知识标签、AI 自动摘要打标 |
| **学习数据** | 模块能力雷达图、近 14 天趋势、模块对比、提分优先级建议 |
| **AI 助手** | 流式对话答疑、一键生成今日学习计划 |
| **系统设置** | 考生信息、AI 接口配置（兼容 OpenAI / DeepSeek / 通义 / 智谱 / Ollama）、数据导出导入与清空 |

---

## 📁 目录结构

```
.
├── index.html              # 入口（按 core → data → components → views 顺序加载脚本并启动）
├── css/
│   ├── base.css            # 设计令牌 / 重置 / 排版 / 工具类
│   ├── layout.css          # 顶栏 / 侧边导航 / 响应式栅格
│   └── components.css      # 卡片 / 图表 / 知识库 / 对话 / 上传等组件样式
├── js/
│   ├── core/               # 基础设施
│   │   ├── utils.js        # DOM / 格式化 / 图标 / Toast / Modal / Drawer
│   │   ├── store.js        # 全局状态 + localStorage 持久化 + 订阅
│   │   ├── db.js           # IndexedDB 封装（存文件 Blob，降级内存）
│   │   ├── router.js        # 极简 hash 路由
│   │   ├── api.js          # AI 适配层（OpenAI 兼容 HTTP 通道）
│   │   ├── ai.js           # AI 门面 + mock 规则引擎（OCR/题型/解题）
│   │   └── ai2.js          # AI 续：对话 / 批改 / 摘要 / 归因 / 计划
│   ├── data/               # 种子数据
│   │   ├── questions.js    # 内置题库（byModule / byId）
│   │   └── seed.js          # AI 卡 / 今日任务 / 知识库示例 / 提示词
│   ├── components/         # 可复用组件
│   │   ├── ui.js           # KPI / 图表（零依赖 SVG）/ 片段
│   │   └── layout.js       # 顶栏 + 导航渲染与事件
│   └── views/              # 各页面视图
│       ├── dashboard.js practice.js shenlun.js mistakes.js
│       ├── photo.js knowledge.js stats.js assistant.js settings.js
├── assets/                 # 静态资源占位（图标、图片等）
└── .nojekyll               # 禁用 GitHub Pages 的 Jekyll 处理
```

---

## 🚀 本地运行

**方式一：直接打开**
双击 `index.html` 在浏览器中打开即可使用（默认模拟模式，无需任何后端）。
> 提示：部分浏览器对 `file://` 下的 IndexedDB 有限制，若上传资料异常，请用方式二启动本地服务器。

**方式二：本地静态服务器（推荐）**
```bash
# 任选其一
npx serve .
# 或
python3 -m http.server 8080
# 或
npx http-server -p 8080
```
然后访问 `http://localhost:8080`。

---

## 🌐 部署到 GitHub Pages

### 一键部署步骤

1. **创建仓库**
   在 GitHub 新建一个仓库（如 `ai-gongkao-workbench`），将本项目全部文件推送到仓库根目录（保持 `index.html` 在根）。

2. **推送代码**
   ```bash
   git init
   git add .
   git commit -m "feat: AI 公考智能训练工作台"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

3. **开启 Pages**
   - 进入仓库 `Settings → Pages`（或 `设置 → 页面`）。
   - **Source** 选择 `Deploy from a branch`。
   - **Branch** 选择 `main`，目录选择 `/ (root)`。
   - 点击 **Save**，等待 1–2 分钟。

4. **访问**
   部署完成后访问 `https://<你的用户名>.github.io/<仓库名>/`。
   项目已包含 `.nojekyll`，确保 `css/`、`js/` 等带点前缀的路径不会被 Jekyll 忽略。

### 通过 GitHub Actions 自动部署（可选）
在项目根目录创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - uses: actions/deploy-pages@v4
```
然后在 `Settings → Pages → Source` 选择 `GitHub Actions` 即可。

---

## 🔌 接入真实 AI 接口

默认所有 AI 能力由内置规则引擎模拟。要接入真实大模型：

1. 进入应用内 **设置 → AI 接口**。
2. 运行模式切到「真实模型」。
3. 填写：
   - **API Base URL**：如 `https://api.openai.com/v1`、`https://api.deepseek.com/v1`、Ollama 本地 `http://localhost:11434/v1` 等。
   - **API Key**：服务商提供的密钥。
   - **对话模型 / 视觉模型**：如 `gpt-4o-mini`、`deepseek-chat` 等。
   - **Temperature**：0–1。
4. 点击「测试连接」验证，再「保存 AI 配置」。

接入后，拍照解题（多模态）、知识库摘要、AI 对话、申论批改将自动调用真实模型，视图层无需任何改动。

**兼容服务**：OpenAI · DeepSeek · 通义千问 · 智谱 GLM · Moonshot(Kimi) · 本地 Ollama（任何 OpenAI 兼容 `/v1` 网关）。

> 技术说明：`js/core/api.js` 为唯一与外部模型交互的通道，支持 `/chat/completions` 流式返回与多模态 `image_url`。如未来要接自有后端，只需替换该文件实现，其余代码保持不变。

---

## 🔒 数据与隐私

- 所有刷题记录、错题、知识库文件、聊天记录均保存在**当前浏览器本地**（`localStorage` + `IndexedDB`），不上传任何服务器。
- 知识库文件以 Blob 形式存入 IndexedDB，刷新不丢失； localStorage 仅保存元数据与缩略图（含 5MB 配额自动降级保护）。
- 仅在「设置」中主动填入真实 API Key 后，才会向对应服务商发起网络请求。
- 建议定期在 **设置 → 数据管理** 中「导出备份」，更换设备或清空浏览器前务必先导出。

---

## 🧱 技术架构

- **零依赖、零构建**：原生 HTML5 + CSS3 + JavaScript，无需 npm / 打包工具，可直接托管到任意静态服务器或 GitHub Pages。
- **组件化 / 命名空间**：所有模块挂在全局 `window.App` 下，按 `core / data / components / views` 分层，职责清晰、易扩展。
- **状态管理**：`App.store` 提供全局状态、持久化与订阅机制。
- **AI 适配层**：业务视图只调用 `App.ai.*`，mock 与真实模型通过 `App.ai._http.isReal()` 切换，解耦彻底。
- **零依赖图表**：能力雷达、趋势曲线、柱状图、热力图、环形进度均为内联 SVG，无第三方图表库。

---

## 🗺️ 后续可扩展方向

- 连接真实题库后端（替换 `App.data.questions` 为接口返回）。
- 知识库接入服务端检索（RAG）+ 真实 PDF/Word 解析与 OCR。
- 多用户账号与云同步。
- 移动端 PWA 离线支持。

---

> 本项目为学习与原型演示用途，内置题库与解析为示例数据，正式备考请以权威教材与真题为准。
