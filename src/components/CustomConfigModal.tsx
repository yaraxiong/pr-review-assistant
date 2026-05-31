import { X } from 'lucide-react'
import type { CustomConfig } from '../lib/credentials'

type CustomConfigForm = Omit<CustomConfig, 'id'>

interface CustomConfigModalProps {
  isOpen: boolean
  editingCustomId: string | null
  form: CustomConfigForm
  onClose: () => void
  onFormChange: (field: string, value: string) => void
  onSave: () => void
}

export default function CustomConfigModal({
  isOpen,
  editingCustomId,
  form,
  onClose,
  onFormChange,
  onSave,
}: CustomConfigModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-[420px] rounded-2xl border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">
            {editingCustomId ? '编辑自定义网关' : '添加自定义网关'}
          </h3>
          <button
            type="button"
            onClick={onClose}
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
              value={form.alias}
              onChange={(e) => onFormChange('alias', e.target.value)}
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
              value={form.baseURL}
              onChange={(e) => onFormChange('baseURL', e.target.value)}
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
              value={form.modelName}
              onChange={(e) => onFormChange('modelName', e.target.value)}
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
              value={form.apiKey}
              onChange={(e) => onFormChange('apiKey', e.target.value)}
              placeholder="sk-xxxxxxxxxxxx"
              className="w-full rounded-lg border border-slate-200/80 bg-white/60 px-3.5 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition focus:border-slate-300 focus:ring-1 focus:ring-slate-900/5"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          保存
        </button>
      </div>
    </div>
  )
}
