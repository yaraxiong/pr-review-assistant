import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReviewResultProps {
  score: number
  report: string
}

function getScoreColor(score: number): string {
  if (score >= 80) {
    return 'text-emerald-500'
  }
  if (score >= 60) {
    return 'text-amber-500'
  }
  return 'text-rose-500'
}

function getScoreEvaluation(score: number): string {
  if (score >= 80) {
    return '优秀，建议合并'
  }
  return '存在优化空间'
}

export default function ReviewResult({ score, report }: ReviewResultProps) {
  return (
    <div className="mt-8 rounded-2xl border border-white/20 bg-white/70 p-8 shadow-xl backdrop-blur-md transition-all duration-300">
      <div className="flex items-center gap-6">
        <p className={`text-5xl font-extrabold tabular-nums ${getScoreColor(score)}`}>
          {score}
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-slate-500">代码健康度评估</p>
          <p className="text-sm text-slate-400">{getScoreEvaluation(score)}</p>
        </div>
      </div>

      <div className="my-6 border-t border-slate-200/50" />

      <div className="prose prose-slate max-w-none text-slate-700 prose-headings:font-semibold prose-a:text-blue-500 prose-pre:bg-slate-950 prose-pre:text-slate-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </div>
    </div>
  )
}
