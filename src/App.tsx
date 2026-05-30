import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Settings, ShieldCheck, Sparkles, Target, Trash2, X } from 'lucide-react'
import {
  BUILTIN_MODELS,
  createEmptyCustomConfigForm,
  DEFAULT_CREDENTIALS,
  generateCustomConfigId,
  loadCredentials,
  resolveActiveModelCredentials,
  saveCredentials,
  type BuiltInModel,
  type CredentialsStorage,
  type CustomConfig,
} from './lib/credentials'
import { fetchPRContext } from './services/github'
import { analyzePR } from './services/llm'
import ReviewResult from './components/ReviewResult'

type ReviewMode = 'enterprise' | 'agile'

interface ReviewResultState {
  score: number
  report: string
}

const BUILTIN_MODEL_LABELS: Record<BuiltInModel, string> = {
  deepseek: 'DeepSeek Coder',
  kimi: 'Kimi 月之暗面',
  qwen: '通义千问 Qwen',
}

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
  const [credentials, setCredentials] = useState<CredentialsStorage>(DEFAULT_CREDENTIALS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [draftFixedKeys, setDraftFixedKeys] = useState(DEFAULT_CREDENTIALS.fixedKeys)
  const [draftCustomConfigs, setDraftCustomConfigs] = useState<CustomConfig[]>([])
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)
  const [customForm, setCustomForm] = useState(createEmptyCustomConfigForm())
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResultState | null>(null)

  useEffect(() => {
    setCredentials(loadCredentials())
  }, [])

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftFixedKeys(credentials.fixedKeys)
      setDraftCustomConfigs(credentials.customConfigs)
    }
  }, [isSettingsOpen, credentials.fixedKeys, credentials.customConfigs])

  const handleActiveModelChange = (activeModel: string) => {
    const updated = { ...credentials, activeModel }
    setCredentials(updated)
    saveCredentials(updated)
  }

  const handleSaveCredentials = () => {
    let activeModel = credentials.activeModel

    const isValidActive =
      BUILTIN_MODELS.includes(activeModel as BuiltInModel) ||
      draftCustomConfigs.some((item) => item.id === activeModel)

    if (!isValidActive) {
      activeModel = 'deepseek'
    }

    const updated = {
      ...credentials,
      activeModel,
      fixedKeys: draftFixedKeys,
      customConfigs: draftCustomConfigs,
    }
    setCredentials(updated)
    saveCredentials(updated)
    setIsSettingsOpen(false)
  }

  const openCreateCustomModal = () => {
    setEditingCustomId(null)
    setCustomForm(createEmptyCustomConfigForm())
    setIsCustomModalOpen(true)
  }

  const openEditCustomModal = (config: CustomConfig) => {
    setEditingCustomId(config.id)
    setCustomForm({
      alias: config.alias,
      baseURL: config.baseURL,
      modelName: config.modelName,
      apiKey: config.apiKey,
    })
    setIsCustomModalOpen(true)
  }

  const handleSaveCustomConfig = () => {
    if (!customForm.alias.trim()) {
      alert('请填写模型别名')
      return
    }
    if (!customForm.baseURL.trim()) {
      alert('请填写 Base URL')
      return
    }
    if (!customForm.modelName.trim()) {
      alert('请填写 Model Name')
      return
    }
    if (!customForm.apiKey.trim()) {
      alert('请填写 API Key')
      return
    }

    if (editingCustomId) {
      setDraftCustomConfigs((prev) =>
        prev.map((item) =>
          item.id === editingCustomId
            ? {
                ...item,
                alias: customForm.alias.trim(),
                baseURL: customForm.baseURL.trim(),
                modelName: customForm.modelName.trim(),
                apiKey: customForm.apiKey.trim(),
              }
            : item,
        ),
      )
    } else {
      setDraftCustomConfigs((prev) => [
        ...prev,
        {
          id: generateCustomConfigId(),
          alias: customForm.alias.trim(),
          baseURL: customForm.baseURL.trim(),
          modelName: customForm.modelName.trim(),
          apiKey: customForm.apiKey.trim(),
        },
      ])
    }

    setIsCustomModalOpen(false)
  }

  const handleDeleteCustomConfig = (id: string) => {
    const target = draftCustomConfigs.find((item) => item.id === id)
    if (!target) {
      return
    }

    const confirmed = window.confirm(`确定删除自定义模型「${target.alias}」吗？`)
    if (!confirmed) {
      return
    }

    setDraftCustomConfigs((prev) => prev.filter((item) => item.id !== id))

    if (credentials.activeModel === id) {
      const updated = { ...credentials, activeModel: 'deepseek' as BuiltInModel }
      setCredentials(updated)
      saveCredentials(updated)
    }
  }

  const handleStartReview = async () => {
    if (!prUrl.trim()) {
      alert('请先输入 GitHub PR 链接')
      return
    }

    const resolved = resolveActiveModelCredentials(credentials)
    if (!resolved) {
      alert('请先点击右上角设置图标，配置当前模型的 API Key')
      return
    }

    setIsReviewing(true)
    setReviewResult(null)

    try {
      const githubData = await fetchPRContext(prUrl)
      const contextData = {
        ...githubData,
        reviewMode: reviewMode === 'enterprise' ? 'A' : 'B',
        customPrompt: personalizedContext,
      }
      const result = await analyzePR(
        contextData,
        resolved.apiKey,
        resolved.selectedModel,
        resolved.endpoint,
      )
      setReviewResult({
        score: result.healthScore,
        report: result.markdownReport,
      })
      console.log('🏆 AI 审查结果出炉:', result)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : '审查过程中发生未知错误')
    } finally {
      setIsReviewing(false)
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
                disabled={isReviewing}
                className={`shrink-0 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] sm:px-10 ${
                  isReviewing ? 'cursor-not-allowed opacity-50 animate-pulse' : ''
                }`}
              >
                {isReviewing ? '正在深度审查中...' : '开始审查'}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm sm:mt-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                  审查上下文配置
                </p>
                <select
                  value={credentials.activeModel}
                  onChange={(e) => handleActiveModelChange(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white/50 px-3 py-1.5 text-sm text-slate-600 outline-none transition focus:border-slate-300/60 focus:ring-1 focus:ring-slate-900/5"
                >
                  {BUILTIN_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {BUILTIN_MODEL_LABELS[model]}
                    </option>
                  ))}
                  {credentials.customConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {`⚙️ ${config.alias}`}
                    </option>
                  ))}
                </select>
              </div>

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

        <section className="flex flex-1 flex-col">
          {isReviewing && (
            <div className="mt-8 rounded-2xl border border-white/20 bg-white/60 p-8 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 shrink-0 rounded-full bg-slate-200 animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-3/5 rounded bg-slate-200 animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-center text-sm text-slate-400 animate-pulse">
                AI 正在逐行扫描代码变更...
              </p>
            </div>
          )}

          {!isReviewing && reviewResult && (
            <ReviewResult score={reviewResult.score} report={reviewResult.report} />
          )}

          {!isReviewing && !reviewResult && (
            <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/60 p-10 shadow-sm backdrop-blur-md sm:min-h-[320px] sm:p-12">
              <p className="text-center text-base font-normal text-slate-400 sm:text-lg">
                审查报告将在此处生成...
              </p>
            </div>
          )}
        </section>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[480px] flex-col rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex shrink-0 items-center justify-between">
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

            <div className="mb-6 flex shrink-0 items-start gap-2.5 rounded-lg bg-slate-100/80 px-3.5 py-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-500" strokeWidth={2} />
              <p className="text-xs leading-relaxed text-slate-500">
                🔑 所有凭证仅加密保存在当前浏览器本地缓存中，绝不会上传至任何第三方服务器。
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
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
                    value={draftFixedKeys[field.key]}
                    onChange={(e) =>
                      setDraftFixedKeys((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder="sk-xxxxxxxxxxxx"
                    className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                  />
                </div>
              ))}

              <div className="border-t border-slate-200/80 pt-5">
                <p className="mb-3 text-sm font-medium text-slate-700">管理自定义模型网关</p>

                {draftCustomConfigs.length === 0 ? (
                  <p className="mb-3 text-xs text-slate-400">暂无自定义模型，点击下方按钮添加</p>
                ) : (
                  <div className="mb-3 space-y-2">
                    {draftCustomConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 p-3"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {config.alias}
                          </p>
                          <p className="truncate text-xs text-slate-400">{config.modelName}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditCustomModal(config)}
                            aria-label={`编辑 ${config.alias}`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
                          >
                            <Pencil size={14} strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomConfig(config.id)}
                            aria-label={`删除 ${config.alias}`}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white hover:text-red-500"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openCreateCustomModal}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/50 py-2.5 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-white/80"
                >
                  <Plus size={16} strokeWidth={2} />
                  添加新模型
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveCredentials}
              className="mt-6 w-full shrink-0 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
            >
              保存并应用
            </button>
          </div>
        </div>
      )}

      {isCustomModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-[420px] rounded-2xl border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">
                {editingCustomId ? '编辑自定义网关' : '添加自定义网关'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                aria-label="关闭"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="custom-alias" className="mb-1.5 block text-xs text-slate-500">
                  模型别名
                </label>
                <input
                  id="custom-alias"
                  type="text"
                  value={customForm.alias}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, alias: e.target.value }))}
                  placeholder="公司高级 API"
                  className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label htmlFor="custom-base-url" className="mb-1.5 block text-xs text-slate-500">
                  Base URL
                </label>
                <input
                  id="custom-base-url"
                  type="url"
                  value={customForm.baseURL}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, baseURL: e.target.value }))}
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
                  value={customForm.modelName}
                  onChange={(e) =>
                    setCustomForm((prev) => ({ ...prev, modelName: e.target.value }))
                  }
                  placeholder="例如: gpt-4, claude-3-haiku"
                  className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
              <div>
                <label htmlFor="custom-api-key" className="mb-1.5 block text-xs text-slate-500">
                  API Key
                </label>
                <input
                  id="custom-api-key"
                  type="password"
                  value={customForm.apiKey}
                  onChange={(e) => setCustomForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-xxxxxxxxxxxx"
                  className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveCustomConfig}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
