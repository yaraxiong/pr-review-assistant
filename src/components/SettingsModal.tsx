import { Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import type { BuiltInModel, CredentialsStorage, CustomConfig } from '../lib/credentials'

interface ModelKeyField {
  key: BuiltInModel
  label: string
  applyUrl: string
  applyLabel: string
}

interface SettingsModalProps {
  isOpen: boolean
  credentials: CredentialsStorage
  draftFixedKeys: Record<BuiltInModel, string>
  draftCustomConfigs: CustomConfig[]
  modelKeyFields: ModelKeyField[]
  onClose: () => void
  onDraftFixedKeysChange: (keys: Record<BuiltInModel, string>) => void
  onDraftCustomConfigsChange: (configs: CustomConfig[]) => void
  onSave: () => void
  onCreateCustom: () => void
  onEditCustom: (config: CustomConfig) => void
  onDeleteCustom: (id: string) => void
}

export default function SettingsModal({
  isOpen,
  draftFixedKeys,
  draftCustomConfigs,
  modelKeyFields,
  onClose,
  onDraftFixedKeysChange,
  onSave,
  onCreateCustom,
  onEditCustom,
  onDeleteCustom,
}: SettingsModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-[480px] flex-col rounded-2xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">API 凭证与模型偏好</h2>
          <button
            type="button"
            onClick={onClose}
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
          {modelKeyFields.map((field) => (
            <div key={field.key}>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={`key-${field.key}`} className="text-sm font-medium text-slate-700">
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
                  onDraftFixedKeysChange({ ...draftFixedKeys, [field.key]: e.target.value })
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
                      <p className="truncate text-sm font-medium text-slate-700">{config.alias}</p>
                      <p className="truncate text-xs text-slate-400">{config.modelName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditCustom(config)}
                        aria-label={`编辑 ${config.alias}`}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCustom(config.id)}
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
              onClick={onCreateCustom}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/50 py-2.5 text-sm text-slate-600 transition hover:border-slate-400 hover:bg-white/80"
            >
              <Plus size={16} strokeWidth={2} />
              添加新模型
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="mt-6 w-full shrink-0 rounded-xl bg-slate-900 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
        >
          保存并应用
        </button>
      </div>
    </div>
  )
}
