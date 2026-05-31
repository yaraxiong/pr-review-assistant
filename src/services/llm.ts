export interface AnalysisResult {
  healthScore: number
  markdownReport: string
}

export interface CustomConfig {
  baseURL: string
  modelName: string
}

type IssueCategory = 'intent' | 'style' | 'robustness'
type IssueSeverity = 'bonus' | 'minor' | 'moderate' | 'critical'

interface ReviewIssue {
  category: IssueCategory
  severity: IssueSeverity
  description: string
}

interface QualitativeReviewResponse {
  summary: string
  issues: ReviewIssue[]
}

const ISSUE_CATEGORIES: IssueCategory[] = ['intent', 'style', 'robustness']

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  intent: '意图契合度',
  style: '规范与优雅度',
  robustness: '逻辑与健壮性',
}

const SEVERITY_EMOJI: Record<IssueSeverity, string> = {
  bonus: '✨',
  minor: '📝',
  moderate: '⚠️',
  critical: '🚨',
}

const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  bonus: '亮点',
  minor: '轻微',
  moderate: '中等',
  critical: '严重',
}

const DEDUCTION_BY_SEVERITY: Record<Exclude<IssueSeverity, 'bonus'>, number> = {
  minor: 5,
  moderate: 10,
  critical: 20,
}

const BONUS_POINTS = 5
const CATEGORY_DEDUCTION_CAP = 30
const BASE_SCORE = 100

const CONTEXT_INJECTION_PROMPT = `你是一个高级代码审查 AI。纯静态扫描工具误报率高的根源在于"缺乏上下文"。系统通过以下"三层上下文注入"机制解决这一痛点，你必须以此作为最高审查准则：
- 局部上下文 (Local Context) - 锚定意图：这是 PR 的 Title 和 Body。让你明确代码变更的初始目的，验证代码修改是否符合 PR 描述。
- 全局上下文 (Global Context) - 注入家规：这是目标仓库的 README.md 或 CONTRIBUTING.md。让你掌握该仓库的专属规范，大幅降低误报（False Positive）。
- 个性化上下文 (Personalized Context) - 动态干预：这是人类开发者提供的【自定义审查焦点】。通过人类的先验知识引导你的注意力（如："死磕闭包陷阱"），极大提升分析准确性。`

const ENTERPRISE_MODE_PROMPT = `【当前场景：企业级重型团队（具备完整 SDD 与 测试驱动流程）】代码量巨大，全量人工 Review 不现实，基础错误已被自动化测试拦截。你的核心任务是：
1. 工具赋能（意图与边界兜底）- 一致性核对：深度读取全局上下文(代表SDD或任务描述)作为绝对准绳，判断代码是否严格按文档实现。
2. 测试边界兜底：专门排查测试用例难以覆盖到的深层逻辑隐患（如复杂状态机流转异常），将高级架构师从繁琐的代码走读中解放出来。拒绝低级语法说教。`

const AGILE_MODE_PROMPT = `【当前场景：敏捷团队/开源社区/小型项目（缺乏完整 SDD）】沟通成本高，审查标准高度依赖"原作者的主观要求"。你的核心任务是：
1. 工具赋能（主观意图捕捉与隐性契约守护）：自动将局部上下文(PR的标题和描述)转化为"临时契约"充当审查锚点，判断代码是否忠实达成了该主观意图。
2. 个性化规则注入：绝对服从个性化上下文(customPrompt)。这是项目作者注入的极具个性化的审查要求。在缺乏文档的荒野中，你必须集中精力做出指哪打哪的高质量审查。`

const QUALITATIVE_OUTPUT_PROMPT = `【角色定位：严苛的 Senior Maintainer】
你是一位极其严苛、拥有极客精神的顶级开源项目维护者。你的职责是进行客观、精准的定性代码审查，识别问题与亮点。你不需要、也不允许输出任何分数、评级或数值化结论。

【审查维度说明】
- category "intent"：意图契合度，代码是否忠实实现 PR 描述的核心诉求。
- category "style"：规范与优雅度，命名、结构、DRY 原则与代码异味。
- category "robustness"：逻辑与健壮性，边界条件、异常处理与潜在致命缺陷。

【severity 分级说明】
- "bonus"：值得肯定的亮点或最佳实践。
- "minor"：轻微问题，不影响核心功能。
- "moderate"：中等问题，建议修复。
- "critical"：严重问题，可能导致崩溃、安全隐患或核心逻辑错误。

【严格的 JSON 输出契约】
你必须且只能返回一个极其纯净的合法 JSON 字符串。禁止任何 Markdown 代码块包裹（如 \`\`\`json），禁止输出任何多余的废话前缀。格式严格为：
{
  "summary": "<1-2句话的核心审查总结>",
  "issues": [
    {
      "category": "intent" | "style" | "robustness",
      "severity": "bonus" | "minor" | "moderate" | "critical",
      "description": "<具体发现的问题或亮点描述>"
    }
  ]
}

【极其重要的输出约束】
请输出 3-6 个最有价值的审查意见，宁缺毋滥。`

const BUILTIN_MODEL_CONFIG: Record<
  'deepseek' | 'kimi' | 'qwen',
  { baseURL: string; modelName: string }
> = {
  deepseek: {
    baseURL: 'https://api.deepseek.com/chat/completions',
    modelName: 'deepseek-chat',
  },
  kimi: {
    baseURL: 'https://api.moonshot.cn/v1/chat/completions',
    modelName: 'moonshot-v1-8k',
  },
  qwen: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelName: 'qwen-plus',
  },
}

function buildSystemPrompt(reviewMode: string): string {
  const modePrompt =
    reviewMode === 'A' ? ENTERPRISE_MODE_PROMPT : AGILE_MODE_PROMPT

  return [CONTEXT_INJECTION_PROMPT, modePrompt, QUALITATIVE_OUTPUT_PROMPT].join('\n\n')
}

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fencedMatch ? fencedMatch[1].trim() : trimmed
}

function isIssueCategory(value: unknown): value is IssueCategory {
  return typeof value === 'string' && ISSUE_CATEGORIES.includes(value as IssueCategory)
}

function isIssueSeverity(value: unknown): value is IssueSeverity {
  return (
    value === 'bonus' ||
    value === 'minor' ||
    value === 'moderate' ||
    value === 'critical'
  )
}

function parseQualitativeReview(content: string): QualitativeReviewResponse {
  const parsed = JSON.parse(extractJsonContent(content)) as QualitativeReviewResponse

  if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.issues)) {
    throw new Error('AI 返回的数据格式不符合预期')
  }

  const issues = parsed.issues.filter(
    (issue): issue is ReviewIssue =>
      isIssueCategory(issue.category) &&
      isIssueSeverity(issue.severity) &&
      typeof issue.description === 'string' &&
      issue.description.trim().length > 0,
  )

  return {
    summary: parsed.summary.trim(),
    issues,
  }
}

function calculateHealthScore(issues: ReviewIssue[]): number {
  const categoryDeductions: Record<IssueCategory, number> = {
    intent: 0,
    style: 0,
    robustness: 0,
  }
  let bonusTotal = 0

  for (const issue of issues) {
    if (issue.severity === 'bonus') {
      bonusTotal += BONUS_POINTS
      continue
    }

    categoryDeductions[issue.category] += DEDUCTION_BY_SEVERITY[issue.severity]
  }

  const cappedDeduction = ISSUE_CATEGORIES.reduce(
    (total, category) =>
      total + Math.min(categoryDeductions[category], CATEGORY_DEDUCTION_CAP),
    0,
  )

  const rawScore = BASE_SCORE - cappedDeduction + bonusTotal
  return Math.max(0, Math.min(100, rawScore))
}

function buildMarkdownReport(review: QualitativeReviewResponse): string {
  const sections: string[] = [`## 审查摘要\n\n${review.summary}\n`]

  if (review.issues.length === 0) {
    sections.push('> 本次审查未发现明显问题，代码质量良好。')
    return sections.join('\n').trim()
  }

  for (const category of ISSUE_CATEGORIES) {
    const categoryIssues = review.issues.filter((issue) => issue.category === category)
    if (categoryIssues.length === 0) {
      continue
    }

    sections.push(`### ${CATEGORY_LABELS[category]}\n`)

    for (const issue of categoryIssues) {
      sections.push(
        `- ${SEVERITY_EMOJI[issue.severity]} **${SEVERITY_LABELS[issue.severity]}** — ${issue.description}`,
      )
    }

    sections.push('')
  }

  return sections.join('\n').trim()
}

function resolveModelConfig(
  selectedModel: string,
  customConfig?: CustomConfig,
): { baseURL: string; modelName: string } {
  if (selectedModel === 'custom') {
    if (!customConfig?.baseURL?.trim() || !customConfig?.modelName?.trim()) {
      throw new Error('自定义网关配置不完整，请填写 Base URL 和 Model Name')
    }
    return {
      baseURL: customConfig.baseURL.trim(),
      modelName: customConfig.modelName.trim(),
    }
  }

  const config = BUILTIN_MODEL_CONFIG[selectedModel as keyof typeof BUILTIN_MODEL_CONFIG]
  if (!config) {
    throw new Error(`不支持的模型: ${selectedModel}`)
  }

  return config
}

export const analyzePR = async (
  contextData: Record<string, unknown>,
  apiKey: string,
  selectedModel: string,
  customConfig?: CustomConfig,
): Promise<AnalysisResult> => {
  try {
    const config = resolveModelConfig(selectedModel, customConfig)

    const reviewMode = String(contextData.reviewMode ?? 'B')
    const systemPrompt = buildSystemPrompt(reviewMode)

    const response = await fetch(config.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(contextData) },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`大模型 API 请求失败 (${response.status}): ${errorBody}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('大模型 API 未返回有效内容')
    }

    const qualitativeReview = parseQualitativeReview(content)
    const healthScore = calculateHealthScore(qualitativeReview.issues)
    const markdownReport = buildMarkdownReport(qualitativeReview)

    return { healthScore, markdownReport }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PR 分析失败: ${error.message}`)
    }
    throw new Error('PR 分析失败: 未知错误')
  }
}
