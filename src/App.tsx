import { useEffect, useState } from 'react'
import { Search, Settings, ShieldCheck, Sparkles, Target, X } from 'lucide-react'
import {
  DEFAULT_CREDENTIALS,
  DEFAULT_CUSTOM_CONFIG,
  loadCredentials,
  saveCredentials,
  type BuiltInModel,
  type Credentials,
  type CustomConfig,
  type ModelProvider,
} from './lib/credentials'
import { fetchPRContext } from './services/github'
import { analyzePR } from './services/llm'

type ReviewMode = 'enterprise' | 'agile'

const MODEL_OPTIONS: { value: ModelProvider; label: string }[] = [
  { value: 'deepseek', label: 'DeepSeek Coder' },
  { value: 'kimi', label: 'Kimi 月之暗面' },
  { value: 'qwen', label: '通义千问 Qwen' },
  { value: 'custom', label: '⚙️ 自定义网关 (Custom API)' },
]

const MODEL_KEY_FIELDS: {
  key: BuiltInModel
  label: string
  applyUrl: string
  applyLabel: string
}[] = [
  {
    key: 'deepseek',
    label: 'DeepSeek Coder',
    applyUrl: 'https://platform.deepseek.com/',
    applyLabel: '免费申请 ↗',
  },
  {
    key: 'kimi',
    label: 'Kimi 月之暗面',
    applyUrl: 'https://platform.moonshot.cn/',
    applyLabel: '申请 Key ↗',
  },
  {
    key: 'qwen',
    label: '通义千问 Qwen',
    applyUrl: 'https://dashscope.console.aliyun.com/',
    applyLabel: '申请 Key ↗',
  },
]

function App() {
  const [prUrl, setPrUrl] = useState('')
  const [reviewMode, setReviewMode] = useState<ReviewMode>('agile')
  const [personalizedContext, setPersonalizedContext] = useState('')
  const [credentials, setCredentials] = useState<Credentials>(DEFAULT_CREDENTIALS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [draftKeys, setDraftKeys] = useState(DEFAULT_CREDENTIALS.keys)
  const [draftCustomConfig, setDraftCustomConfig] = useState<CustomConfig>(DEFAULT_CUSTOM_CONFIG)

  useEffect(() => {
    setCredentials(loadCredentials())
  }, [])

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftKeys(credentials.keys)
      setDraftCustomConfig(credentials.customConfig)
    }
  }, [isSettingsOpen, credentials.keys, credentials.customConfig])

  const handleActiveModelChange = (activeModel: ModelProvider) => {
    const updated = { ...credentials, activeModel }
    setCredentials(updated)
    saveCredentials(updated)
  }

  const handleSaveCredentials = () => {
    const updated = {
      ...credentials,
      keys: draftKeys,
      customConfig: draftCustomConfig,
    }
    setCredentials(updated)
    saveCredentials(updated)
    setIsSettingsOpen(false)
  }

  const handleStartReview = async () => {
    if (!prUrl.trim()) {
      alert('请先输入 GitHub PR 链接')
      return
    }

    const apiKey = credentials.keys[credentials.activeModel]?.trim()
    if (!apiKey) {
      alert('请先点击右上角设置图标，配置当前模型的 API Key')
      return
    }

    try {
      const githubData = await fetchPRContext(prUrl)
      const contextData = {
        ...githubData,
        reviewMode: reviewMode === 'enterprise' ? 'A' : 'B',
        customPrompt: personalizedContext,
      }
      const result = await analyzePR(
        contextData,
        apiKey,
        credentials.activeModel,
        credentials.customConfig,
      )
      console.log('🏆 AI 审查结果出炉:', result)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : '审查过程中发生未知错误')
    }
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 to-gray-100 font-sans antialiased">
      <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
        {/* Header */}
        <header className="relative mb-16 text-center sm:mb-20 lg:mb-24">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="打开 API 凭证与模型设置"
            className="absolute right-0 top-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/40 hover:text-slate-600"
          >
            <Settings size={18} strokeWidth={1.75} />
          </button>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium tracking-wide text-slate-500 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            AI-Powered Review
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            AI PR Review Assistant
          </h1>
          <p className="mt-4 text-base font-normal text-slate-500 sm:mt-5 sm:text-lg">
            Insightful Code Review in Seconds
          </p>
        </header>

        {/* Interactive Area */}
        <section className="mb-12 sm:mb-16">
          <div className="rounded-2xl border border-white/20 bg-white/60 p-2 shadow-sm backdrop-blur-md sm:p-3">
            {/* PR Input + Action */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="url"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="输入 GitHub PR 链接..."
                  className="w-full rounded-xl border border-white/30 bg-white/50 py-3.5 pl-12 pr-4 text-base text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300/60 focus:bg-white/70 focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
              <button
                type="button"
                onClick={handleStartReview}
                className="shrink-0 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] sm:px-10"
              >
                开始审查
              </button>
            </div>

            {/* Review Context Configuration */}
            <div className="mt-3 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm sm:mt-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                  审查上下文配置
                </p>
                <select
                  value={credentials.activeModel}
                  onChange={(e) => handleActiveModelChange(e.target.value as ModelProvider)}
                  className="rounded-lg border border-white/30 bg-white/50 px-3 py-1.5 text-sm text-slate-600 outline-none transition focus:border-slate-300/60 focus:ring-1 focus:ring-slate-900/5"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Review Mode Toggle */}
              <fieldset className="mb-5 border-0 p-0">
                <legend className="sr-only">审查模式</legend>
                <div
                  role="radiogroup"
                  aria-label="审查模式"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {(
                    [
                      {
                        value: 'enterprise' as const,
                        label: '企业严苛模式',
                        tag: 'Enterprise',
                        description: '深度排查隐患与规范',
                      },
                      {
                        value: 'agile' as const,
                        label: '敏捷意图模式',
                        tag: 'Agile',
                        description: '宽容代码风格，聚焦核心意图',
                      },
                    ] as const
                  ).map((mode) => {
                    const isSelected = reviewMode === mode.value
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setReviewMode(mode.value)}
                        className={`rounded-lg border px-4 py-3 text-left transition ${
                          isSelected
                            ? 'border-white/50 bg-white/70 shadow-sm'
                            : 'border-transparent bg-white/20 hover:border-white/30 hover:bg-white/30'
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-sm font-medium ${isSelected ? 'text-slate-700' : 'text-slate-500'}`}
                          >
                            {mode.label}
                          </span>
                          <span className="text-xs text-slate-400">({mode.tag})</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {mode.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {/* Personalized Context Input */}
              <div className="relative">
                <Target
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  value={personalizedContext}
                  onChange={(e) => setPersonalizedContext(e.target.value)}
                  placeholder="添加自定义验证约束，例如：重点排查内存泄漏风险..."
                  className="w-full rounded-lg border border-white/25 bg-white/30 py-2.5 pl-10 pr-4 text-sm text-slate-600 placeholder:text-slate-400 outline-none transition focus:border-white/40 focus:bg-white/45 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Placeholder Report Area */}
        <section className="flex flex-1 flex-col">
          <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/60 p-10 shadow-sm backdrop-blur-md sm:min-h-[320px] sm:p-12">
            <p className="text-center text-base font-normal text-slate-400 sm:text-lg">
              审查报告将在此处生成...
            </p>
          </div>
        </section>
      </main>

      {/* BYOK Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-[480px] rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl transition-all duration-200">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">API 凭证与模型偏好</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="关闭设置"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-slate-100/80 px-3.5 py-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-500" strokeWidth={2} />
              <p className="text-xs leading-relaxed text-slate-500">
                🔑 所有凭证仅加密保存在当前浏览器本地缓存中，绝不会上传至任何第三方服务器。
              </p>
            </div>

            <div className="space-y-5">
              {MODEL_KEY_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor={`key-${field.key}`}
                      className="text-sm font-medium text-slate-700"
                    >
                      {field.label}
                    </label>
                    <a
                      href={field.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      {field.applyLabel}
                    </a>
                  </div>
                  <input
                    id={`key-${field.key}`}
                    type="password"
                    value={draftKeys[field.key]}
                    onChange={(e) =>
                      setDraftKeys((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder="sk-xxxxxxxxxxxx"
                    className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                  />
                </div>
              ))}
            </div>

            <div className="my-5 border-t border-slate-200/80" />

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                自定义 API (兼容 OpenAI 格式)
              </p>
              <div>
                <label htmlFor="custom-base-url" className="mb-1.5 block text-xs text-slate-500">
                  Base URL
                </label>
                <input
                  id="custom-base-url"
                  type="url"
                  value={draftCustomConfig.baseURL}
                  onChange={(e) =>
                    setDraftCustomConfig((prev) => ({ ...prev, baseURL: e.target.value }))
                  }
                  placeholder="https://api.openai.com/v1/chat/completions"
                  className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label htmlFor="custom-model-name" className="mb-1.5 block text-xs text-slate-500">
                  Model Name
                </label>
                <input
                  id="custom-model-name"
                  type="text"
                  value={draftCustomConfig.modelName}
                  onChange={(e) =>
                    setDraftCustomConfig((prev) => ({ ...prev, modelName: e.target.value }))
                  }
                  placeholder="例如: gpt-4, claude-3-haiku"
                  className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label htmlFor="key-custom" className="mb-1.5 block text-xs text-slate-500">
                  API Key
                </label>
                <input
                  id="key-custom"
                  type="password"
                  value={draftKeys.custom}
                  onChange={(e) =>
                    setDraftKeys((prev) => ({ ...prev, custom: e.target.value }))
                  }
                  placeholder="sk-xxxxxxxxxxxx"
                  className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveCredentials}
              className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
            >
              保存并应用
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
