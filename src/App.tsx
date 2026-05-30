import { useState } from 'react'
import { Search, Sparkles, Target } from 'lucide-react'

type ReviewMode = 'enterprise' | 'agile'

function App() {
  const [prUrl, setPrUrl] = useState('')
  const [reviewMode, setReviewMode] = useState<ReviewMode>('agile')
  const [personalizedContext, setPersonalizedContext] = useState('')

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 to-gray-100 font-sans antialiased">
      <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 py-16 sm:px-8 sm:py-20 lg:py-24">
        {/* Header */}
        <header className="mb-16 text-center sm:mb-20 lg:mb-24">
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
                className="shrink-0 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] sm:px-10"
              >
                开始审查
              </button>
            </div>

            {/* Review Context Configuration */}
            <div className="mt-3 rounded-xl border border-white/20 bg-white/40 p-4 backdrop-blur-sm sm:mt-4 sm:p-5">
              <p className="mb-4 text-xs font-medium tracking-wide text-slate-400 uppercase">
                审查上下文配置
              </p>

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
    </div>
  )
}

export default App
