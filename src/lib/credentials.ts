export type ModelProvider = 'deepseek' | 'kimi' | 'qwen'

export interface Credentials {
  activeModel: ModelProvider
  keys: Record<ModelProvider, string>
}

export const CREDENTIALS_STORAGE_KEY = 'pr_assistant_credentials'

export const DEFAULT_CREDENTIALS: Credentials = {
  activeModel: 'deepseek',
  keys: {
    deepseek: '',
    kimi: '',
    qwen: '',
  },
}

export function loadCredentials(): Credentials {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_CREDENTIALS
    }

    const parsed = JSON.parse(raw) as Partial<Credentials>
    const activeModel = parsed.activeModel ?? DEFAULT_CREDENTIALS.activeModel

    return {
      activeModel:
        activeModel === 'deepseek' || activeModel === 'kimi' || activeModel === 'qwen'
          ? activeModel
          : DEFAULT_CREDENTIALS.activeModel,
      keys: {
        ...DEFAULT_CREDENTIALS.keys,
        ...parsed.keys,
      },
    }
  } catch {
    return DEFAULT_CREDENTIALS
  }
}

export function saveCredentials(credentials: Credentials): void {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}
