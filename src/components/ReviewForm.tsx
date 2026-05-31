import { Search, Target } from 'lucide-react'
import { BUILTIN_MODELS, type BuiltInModel, type CredentialsStorage } from '../lib/credentials'

type ReviewMode = 'enterprise' | 'agile'

interface ReviewFormProps {
  prUrl: string
  reviewMode: ReviewMode
  personalizedContext: string
  credentials: CredentialsStorage
  isReviewing: boolean
  builtinModelLabels: Record<BuiltInModel, string>
  onPrUrlChange: (val: string) => void
  onReviewModeChange: (val: ReviewMode) => void
  onPersonalizedContextChange: (val: string) => void
  onActiveModelChange: (val: string) => void
  onStartReview: () => void
}

export default function ReviewForm({
  prUrl,
  reviewMode,
  personalizedContext,
  credentials,
  isReviewing,
  builtinModelLabels,
  onPrUrlChange,
  onReviewModeChange,
  onPersonalizedContextChange,
  onActiveModelChange,
  onStartReview,
}: ReviewFormProps) {
  return (
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
              onChange={(e) => onPrUrlChange(e.target.value)}
              placeholder="输入 GitHub PR 链接..."
              className="w-full rounded-xl border border-white/30 bg-white/50 py-3.5 pl-12 pr-4 text-base text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300/60 focus:bg-white/70 focus:ring-2 focus:ring-slate-900/5"
            />
          </div>
          <button
            type="button"
            onClick={onStartReview}
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
              onChange={(e) => onActiveModelChange(e.target.value)}
              className="rounded-lg border border-white/30 bg-white/50 px-3 py-1.5 text-sm text-slate-600 outline-none transition focus:border-slate-300/60 focus:ring-1 focus:ring-slate-900/5"
            >
              {BUILTIN_MODELS.map((model) => (
                <option key={model} value={model}>
                  {builtinModelLabels[model]}
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
                    onClick={() => onReviewModeChange(mode.value)}
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
              onChange={(e) => onPersonalizedContextChange(e.target.value)}
              placeholder="添加自定义验证约束，例如：重点排查内存泄漏风险..."
              className="w-full rounded-lg border border-white/25 bg-white/30 py-2.5 pl-10 pr-4 text-sm text-slate-600 placeholder:text-slate-400 outline-none transition focus:border-white/40 focus:bg-white/45 focus:ring-1 focus:ring-slate-900/5"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
