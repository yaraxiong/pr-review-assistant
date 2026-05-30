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

const OUTPUT_FORMAT_PROMPT = `禁止输出任何 Markdown 代码块包裹（如 \`\`\`json），禁止输出任何多余的废话前缀。你必须且只能返回一个极其纯净的合法 JSON 字符串。格式严格为：{ "healthScore": 数字(0-100), "markdownReport": "详细的 Markdown 格式评审文本" }`

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

  return [CONTEXT_INJECTION_PROMPT, modePrompt, OUTPUT_FORMAT_PROMPT].join('\n\n')
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
