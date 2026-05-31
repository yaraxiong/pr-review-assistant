# AI PR Review 助手

<div align="center">

<p>本项目旨在提供一个以 AI 辅助分析为核心、具备深层上下文感知的代码评审工具。</p>

<p>架构亮点：<strong>双轨路由</strong> · <strong>三层上下文注入</strong> ·  <strong>定性与定量剥离</strong> · <strong>零服务器成本（BYOK）</strong></p>
<p align="center">
  🚀 <a href="https://pr-review-assistant-ashy.vercel.app/" target="_blank"><b>在线体验 (Live Demo)</b></a> 
  &nbsp;&nbsp; | &nbsp;&nbsp;
  🎬 <a href="https://www.bilibili.com/video/BV1wmVD6nEeh?vd_source=bb8ab85c5b91b9653afbde5a608de3fc" target="_blank"><b>演示视频 (Video Pitch)</b></a>
</p>

</div>

---

## 🎯 核心定位与业务场景

本产品的核心护城河在于提供自动化的审查工作流，不仅局限于传统的"语法检查"，更着重于**逻辑意图的审计**与**深层代码隐患的挖掘**。针对不同规范程度的研发流水线，本工具设计了"双轨制"审查场景：

- **场景 A：企业级重型团队（具备完整 SDD）** — 侧重于"一致性核对"与"测试边界兜底"，排查测试用例难以覆盖的深层逻辑隐患。
- **场景 B：敏捷团队/开源社区（缺乏完整 SDD）** — 自动捕捉主观意图与守护隐性契约，允许注入个性化的审查要求，在缺乏文档的场景中实现高质量的定制化审查。

---

## 🧠 核心设计

### 三层上下文注入

纯静态扫描工具误报率高的根源在于缺乏上下文。系统通过 GitHub API 并发抓取多维数据，为大模型构建全知视角：

- **局部上下文 (锚定意图)：** 抓取 PR `Title` / `Body` / `Commit Messages`，核对代码变更是否偏离了初始目的。
- **全局上下文 (注入契约)：** 读取 `README.md` / `CONTRIBUTING.md`，校验代码是否符合仓库的既有规范与约定。
- **个性化上下文 (动态干预)：** 接收用户自定义焦点输入，确保大模型注意到 Reviewer 特别关心的领域。

个性化上下文单独注入到 System Prompt 末尾作为最高优先级指令，避免在长文本 diff 中被稀释。

### 双轨审查架构

不同团队对代码审查的诉求截然不同。系统在 **Prompt 约束、数据流结构、算分权重** 三个维度实现了物理级别的双轨路由：

- **企业模式（防守型）**：以全局文档为绝对准绳，优先排查深层隐患与边界情况，Robustness 维度 1.5 倍加权
- **敏捷模式（进攻型）**：以 PR 描述为临时契约，聚焦意图对齐与隐性契约守护，Intent 维度 1.5 倍加权

### 定性与定量剥离的算分引擎

```
LLM 职责：定性分析 → 输出 issues 数组（发现问题与亮点）
TS 职责：定量计算 → 根据固定加权规则推导 healthScore
```

- LLM 输出包含 category / severity / description 的结构化数据
- 本地 `calculateHealthScore()` 按固定规则逐条计算，同等输入永远输出同等分数
- 单维度扣分上限 30 分，防止某类问题过度惩罚
- 最终 `Math.max(0, Math.min(100))` 兜底

---

## ⚙️ 技术实现

```
GitHub API (5 路并发) ──┐
                        ├─ 三层上下文组装 ──→ 双轨路由 ──→ LLM 定性审查 ──→ TS 算分引擎 ──→ Markdown 报告
                        │                (A/B 模式)     (issues 数组)     (固定加权)      (ReactMarkdown)
                        └─ 403 限流兜底                                              ↑
                                                                               个性化上下文
                                                                          (独立前置注入 System Prompt)
```

### 技术栈

- **前端框架：** React 18 + TypeScript + Vite（轻量纯前端，无需服务端）
- **UI 样式：** Tailwind CSS（快速构建现代 SaaS 级极简界面）
- **报告渲染：** `react-markdown` + `remark-gfm`（优雅呈现 Markdown 审查报告）
- **状态管理：** 组件内 `useState`（无外部依赖，单页应用轻量够用）
- **API 通信：** GitHub REST API（支持匿名访问 PR 数据）与 BYOK 机制（零服务器成本，隐私可控）
- **部署架构：** Vercel Edge Network + 独立域名 Anycast 加速（规避国内 SNI 阻断，实现全球节点免备案秒开）

### BYOK 多模型网关

支持动态接入任意 OpenAI 兼容的 LLM API：

- **开箱即用：** 内置 DeepSeek Coder、Kimi 月之暗面、通义千问 Qwen，配置 Key 即用。
- **动态扩展：** 支持手动填写 `baseURL` + `modelName` + `Key`，无缝接入自定义网关或私有化部署模型。

---

## 🛡️ 边界情况处理

- **非逻辑文件过滤**：自动剔除 `.svg` / `.lock` / `package-lock.json` / `yarn.lock` 的 diff，减少 Token 浪费
- **API 限流防护**：捕获 HTTP 403 与网络错误，统一抛出可读提示，引导用户稍后重试或配置 Token
- **空 issues 保护**：LLM 未发现问题时，healthScore = 100，报告显示"未发现明显问题"
- **非法输出过滤**：类型守卫校验 LLM 返回的 category 和 severity 是否属于合法枚举值

---

## 🔮 演进路线

- **零等待交互**：接入 SSE 流式输出，审查报告逐行渲染，消除黑盒等待感
- **大文件智能切片**：针对超大 PR 自动按文件优先级切片，保障核心变更审查质量
- **一键修复生成**：针对审查出的问题，AI 自动生成 Diff 修复补丁
- **CI/CD 集成**：封装为 GitHub Action，提交后自动在 PR 评论区回复审查报告

---

## 🚀 本地运行

```bash
npm install
npm run dev
```

点击右上角 ⚙️ 图标配置模型 API Key 后即可使用。
