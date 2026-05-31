# AI PR Review 助手

<div align="center">

<p>🎯 一个解决「缺乏文档时的意图审计」与「代码隐性风险挖掘」的 AI 代码评审工具</p>

<p>💡 架构决策亮点：<strong>定性与定量剥离</strong> · <strong>双轨路由</strong> · <strong>三层上下文注入</strong> · <strong>零服务器成本（BYOK）</strong></p>

<p>
  <a href="你的部署网址" target="_blank">🌐 在线体验</a> •
  <a href="你的演示视频地址" target="_blank">🎬 演示视频</a> •
  <a href="你的GitHub仓库地址" target="_blank">📦 项目源码</a>
</p>

</div>

---

## 💡 产品定位：不是 Linter，而是上下文感知的审查 Agent

本产品诞生于对真实企业开发痛点的调研：**在没有完整 SDD（需求设计文档）的敏捷团队或开源项目中，Code Review 成本极高且标准模糊**。

- 不做普通 Linter 就能干的语法检查
- **核心价值**：提供自动化审查工作流，着重于**逻辑意图的审计**与**深层代码隐患的挖掘**

---

## 🧩 产品架构：为什么这样设计？

### 1. 定义问题：传统 Code Review 的三大痛点

| 痛点 | 描述 |
|---|---|
| **缺乏 SDD** | 大部分 PR 没有全局设计文档，Review 时不知道"应该长什么样" |
| **上下文缺失** | 只看 Diff 无法了解 PR 的意图、仓库规范、团队偏好，导致大量无效评论 |
| **标准模糊** | 不同团队对"好代码"的定义不同，一套规则无法适应所有场景 |

### 2. 设计系统：双轨制审查 + 三层上下文注入

<table>
  <tr>
    <th>场景</th>
    <th>核心诉求</th>
    <th>AI 审查策略</th>
  </tr>
  <tr>
    <td><strong>企业级重型团队（有 SDD）</strong></td>
    <td>代码是否严格按文档实现？测试难以覆盖的深层逻辑？</td>
    <td>以文档为准绳，重点核对一致性；挖掘并发、内存、异常等暗雷</td>
  </tr>
  <tr>
    <td><strong>敏捷/开源团队（无 SDD）</strong></td>
    <td>代码是否符合 PR 描述？是否符合作者的主观要求？</td>
    <td>将 PR 标题/描述作为"临时契约"；支持个性化规则注入</td>
  </tr>
</table>

**三层上下文注入（彻底解决误报）：**

| 层级 | 数据来源 | 解决的问题 |
|---|---|---|
| 局部上下文 | PR Title / Body / Commit Messages | 锚定变更意图 |
| 全局上下文 | README.md / CONTRIBUTING.md | 注入既有规范 |
| 个性化上下文 | 用户自定义焦点输入 | 动态干预，让 AI 按 Reviewer 的重点审查 |

个性化上下文作为独立系统指令单独注入到 Prompt 末尾，避免在长文本 diff 中被稀释。

### 3. 关键决策：定性与定量剥离，消除分数幻觉

- **决策内容**：不让 LLM 计算健康度分数，只让其输出定性问题列表（类别、严重程度、描述）
- **原因**：LLM 在算术上存在严重幻觉，同一 PR 两次评分可能差 20 分，影响可信度
- **实现**：前端根据固定加权规则自动计算分数，同等输入永远输出同等分数

### 4. 商业价值：降本增效 + 质量左移

- **降本**：自动化意图审计和深层风险挖掘，预计可节省 Senior Engineer 30% 的 Review 时间
- **增效**：快速定位高风险代码，缩短 PR 合并周期
- **质量左移**：在代码合入前发现逻辑缺陷，减少线上事故

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

| 技术层 | 选型 | 说明 |
|---|---|---|
| 前端 | React 18 + TypeScript + Vite | 纯静态，无服务端 |
| UI | Tailwind CSS | 快速构建 SaaS 级界面 |
| 报告渲染 | react-markdown + remark-gfm | 支持表格、列表 |
| API | GitHub REST API（无认证，限 60 req/h） | 获取 PR diff、元数据 |
| LLM 网关 | BYOK（自备 Key） | 零服务器成本，支持 DeepSeek Coder、Kimi、Qwen 等 |

---

## 🛡️ 边界情况处理

- 自动过滤 `.svg`、`.lock`、`package-lock.json` 等非逻辑文件，节省 Token
- 捕获 GitHub API 403 限流，给出友好提示
- 空 issues 时健康度自动为 100，报告显示"未发现明显问题"

---

## 🚀 未来演进路线

- **流式输出**：接入 SSE，报告逐字渲染，消除等待焦虑
- **大文件智能切片**：按文件优先级裁剪 Diff，保障核心变更审查
- **一键修复生成**：针对问题自动生成 Diff 补丁
- **CI/CD 集成**：封装为 GitHub Action，自动评论 PR

---

## 🧪 本地运行

```bash
git clone <仓库地址>
npm install
npm run dev
```

点击右上角 ⚙️ 图标配置模型 API Key 即可使用。
