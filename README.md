# AI PR Review 助手 (AI PR Review Assistant)

本项目是七牛云 XEngineer 极客松参赛作品，旨在提供一个以 AI 辅助分析为核心、具备深层上下文感知的代码评审工具。

## 🎯 核心定位与业务场景

本产品的核心护城河在于提供自动化的审查工作流，不仅局限于传统的“语法检查”，更着重于**逻辑意图的审计**与**深层代码隐患的挖掘**。针对不同规范程度的研发流水线，本工具设计了“双轨制”审查场景：

- **场景 A：企业级重型团队（具备完整 SDD）**
  侧重于“一致性核对”与“测试边界兜底”，排查测试用例难以覆盖的深层逻辑隐患。
- **场景 B：敏捷团队/开源社区（缺乏完整 SDD）**
  自动捕捉主观意图与守护隐性契约，允许注入个性化的审查要求，在缺乏文档的场景中实现高质量的定制化审查。

## 🧠 核心机制：三层上下文感知

为解决纯静态扫描工具误报率高的问题，本工具构建了三层上下文感知机制：

1. **局部上下文 (Local Context) - 锚定意图：** 抓取 PR 的 `Title` 和 `Body`，让 AI 明确代码变更的初始目的，验证代码修改是否符合 PR 描述。
2. **全局上下文 (Global Context) - 注入规范：** 自动读取目标仓库的 `README.md` 或 `CONTRIBUTING.md`，审查代码是否符合团队的既有代码规范。
3. **个性化上下文 (Personalized Context) - 动态干预：** 提供自定义审查焦点配置，通过开发者的先验知识引导 AI 的注意力，大幅提升分析准确性。

## ✨ 产品亮点 (Key Features)

- **量化健康度评估 (Quantified Health Score)：** 审查结果以结构化 JSON 输出，顶部呈现 **0–100 代码健康度评分**，配合色彩分级与动态评价文案，将冗长的评审报告压缩为可一眼判读的核心指标，显著降低 Review 认知负担。
- **极客风 BYOK 资产管理 (Bring Your Own Key)：** 采用纯前端本地缓存策略（`localStorage`），凭证永不离开浏览器。内置 DeepSeek、Kimi、通义千问等主流模型，并支持**动态添加与管理多个自定义网关**（OneAPI、内网模型、Ollama 等任意 OpenAI 兼容接口），零服务器成本，隐私可控，极客友好。

## 🏗️ MVP 技术架构

聚焦于打通“获取 GitHub 数据 -> AI 分析 -> 报告展示”的最小可用闭环（纯前端 Serverless 架构）。

- **前端基建:** React 18 + TypeScript + Vite
- **样式构建:** Tailwind CSS（采用现代化的玻璃拟物设计语言，打造 SaaS 级极简 UI）
- **报告渲染:** `react-markdown` + `remark-gfm` + `@tailwindcss/typography`，以 `prose` 排版引擎优雅呈现 Markdown 审查报告
- **数据层:** GitHub REST API 并发抓取（PR 元信息 / README / Diff）+ 多模型 LLM 路由（DeepSeek / Kimi / Qwen / Custom）

## 🔮 演进路线 (Future Work)

- **大文件与 Token 拦截兜底:** 针对超大 PR 触发保护机制，自动过滤 `.lock`、`.svg` 等非逻辑文件，保障核心变更的审查质量并防止 Token 超载。
- **极速反馈闭环 (Auto Fix):** 针对审查出的逻辑漏洞或风险代码，提供一键生成修复建议代码的功能，实现闭环。
- **CI/CD 深度集成自动化流水线:** 计划封装为 GitHub Action，实现提交 Commit 后，自动在 PR 评论区回复评审报告，完成完整的 DevOps 闭环。

## 🚀 本地运行指南

1. `npm install`
2. 点击右上角 ⚙️ 设置面板，配置模型 API Key（支持 BYOK 多网关管理）
3. `npm run dev`
