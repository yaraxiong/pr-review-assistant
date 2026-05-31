import { useEffect, useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import CustomConfigModal from './components/CustomConfigModal'
import ReviewForm from './components/ReviewForm'
import ReviewResult from './components/ReviewResult'
import SettingsModal from './components/SettingsModal'
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

  const handleCustomFormChange = (field: string, value: string) => {
    setCustomForm((prev) => ({ ...prev, [field]: value }))
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

        <ReviewForm
          prUrl={prUrl}
          reviewMode={reviewMode}
          personalizedContext={personalizedContext}
          credentials={credentials}
          isReviewing={isReviewing}
          builtinModelLabels={BUILTIN_MODEL_LABELS}
          onPrUrlChange={setPrUrl}
          onReviewModeChange={setReviewMode}
          onPersonalizedContextChange={setPersonalizedContext}
          onActiveModelChange={handleActiveModelChange}
          onStartReview={handleStartReview}
        />

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

      <SettingsModal
        isOpen={isSettingsOpen}
        credentials={credentials}
        draftFixedKeys={draftFixedKeys}
        draftCustomConfigs={draftCustomConfigs}
        modelKeyFields={MODEL_KEY_FIELDS}
        onClose={() => setIsSettingsOpen(false)}
        onDraftFixedKeysChange={setDraftFixedKeys}
        onDraftCustomConfigsChange={setDraftCustomConfigs}
        onSave={handleSaveCredentials}
        onCreateCustom={openCreateCustomModal}
        onEditCustom={openEditCustomModal}
        onDeleteCustom={handleDeleteCustomConfig}
      />

      <CustomConfigModal
        isOpen={isCustomModalOpen}
        editingCustomId={editingCustomId}
        form={customForm}
        onClose={() => setIsCustomModalOpen(false)}
        onFormChange={handleCustomFormChange}
        onSave={handleSaveCustomConfig}
      />
    </div>
  )
}

export default App
