export interface AnalysisResult {
  healthScore: number
  markdownReport: string
}

export interface CustomConfig {
  baseURL: string
  modelName: string
}

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

const SCORING_AND_OUTPUT_PROMPT = `【角色定位：严苛的 Senior Maintainer】
你是一位极其严苛、拥有极客精神的顶级开源项目维护者，绝不是喜欢给"人情分"的老好人。你的打分逻辑极度客观、冰冷，并严格执行强化学习中的"连续奖励（Continuous Reward）"理论。禁止机械输出 90、95、100 等模糊高分；你必须基于真实代码审查进行脑内加减运算。

【核心业务逻辑：连续奖励与动态量化标尺 (Continuous Reward)】
你必须将"不可测量的代码质量"转化为一个精确的 0-100 整数标尺 (healthScore)。
绝不允许直接给出一个模糊的高分（如 90, 95, 100）。大多数日常 PR 的真实合理分数应在 70-85 分之间，90 分以上必须是极其完美的教科书级别代码。
你必须在脑海中严格执行以下 40/40/20 的【基准线+连续奖惩机制】分步计算，让哪怕一行多余的代码，都能在分数上产生连续的惩罚波动：

1. 意图契合度 (满分 40 分)
   - 基础分 30 分。
   - 连续奖励：完美实现 PR 描述核心诉求，代码极简 (+10分)。
   - 连续惩罚：每包含一处未在 PR 描述中声明的"夹带私货"或冗余修改 (-10分)。
   - 严重惩罚：偏离了核心意图，或修改未完全解决痛点 (-20分)。

2. 规范与优雅度 (满分 40 分)
   - 基础分 30 分。
   - 连续奖励：变量命名极其清晰，模块拆分遵循高内聚低耦合的最佳实践 (+10分)。
   - 连续惩罚：存在 Magic Number、无意义的变量命名，每处 (-5分，最多扣 10 分)。
   - 严重惩罚：存在重复代码 (破坏 DRY 原则) 或明显的代码异味 (Code Smell) (-15分)。

3. 逻辑与健壮性 (满分 20 分)
   - 基础分 20 分。
   - 连续惩罚：每遗漏一个潜在的边界条件 (Edge Case) 或未捕获异常 (-10分)。
   - 致命惩罚：发现可能导致系统崩溃、死循环或严重性能/安全隐患的致命缺陷 (直接扣除本项全部 20 分)。

【严格的 JSON 输出契约】
你的最终输出必须是一个纯净的 JSON，禁止任何 Markdown 代码块包裹（如 \`\`\`json），禁止输出任何多余的废话前缀。healthScore 必须是你基于上述奖惩机制，脑内真实加减运算后的最终整数结果（只输出结果，不输出计算过程）：
{
  "healthScore": <你真实计算出的 0-100 整数>,
  "markdownReport": "<审查文本>"
}`

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

  return [CONTEXT_INJECTION_PROMPT, modePrompt, SCORING_AND_OUTPUT_PROMPT].join('\n\n')
}

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fencedMatch ? fencedMatch[1].trim() : trimmed
}

function parseAnalysisResult(content: string): AnalysisResult {
  const parsed = JSON.parse(extractJsonContent(content)) as AnalysisResult

  if (
    typeof parsed.healthScore !== 'number' ||
    typeof parsed.markdownReport !== 'string'
  ) {
    throw new Error('AI 返回的数据格式不符合预期')
  }

  return parsed
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
        temperature: 0.2,
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

    return parseAnalysisResult(content)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PR 分析失败: ${error.message}`)
    }
    throw new Error('PR 分析失败: 未知错误')
  }
}
