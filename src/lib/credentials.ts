export type ModelProvider = 'deepseek' | 'kimi' | 'qwen' | 'custom'

export type BuiltInModel = 'deepseek' | 'kimi' | 'qwen'

export interface CustomConfig {
  baseURL: string
  modelName: string
}

export interface Credentials {
  activeModel: ModelProvider
  keys: Record<ModelProvider, string>
  customConfig: CustomConfig
}

export const CREDENTIALS_STORAGE_KEY = 'pr_assistant_credentials'

export const DEFAULT_CUSTOM_CONFIG: CustomConfig = {
  baseURL: 'https://api.openai.com/v1/chat/completions',
  modelName: 'gpt-4o-mini',
}

export const DEFAULT_CREDENTIALS: Credentials = {
  activeModel: 'deepseek',
  keys: {
    deepseek: '',
    kimi: '',
    qwen: '',
    custom: '',
  },
  customConfig: DEFAULT_CUSTOM_CONFIG,
}

const VALID_MODELS: ModelProvider[] = ['deepseek', 'kimi', 'qwen', 'custom']

export function loadCredentials(): Credentials {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_CREDENTIALS
    }

    const parsed = JSON.parse(raw) as Partial<Credentials>
    const activeModel = parsed.activeModel ?? DEFAULT_CREDENTIALS.activeModel

    return {
      activeModel: VALID_MODELS.includes(activeModel as ModelProvider)
        ? (activeModel as ModelProvider)
        : DEFAULT_CREDENTIALS.activeModel,
      keys: {
        ...DEFAULT_CREDENTIALS.keys,
        ...parsed.keys,
      },
      customConfig: {
        ...DEFAULT_CUSTOM_CONFIG,
        ...parsed.customConfig,
      },
    }
  } catch {
    return DEFAULT_CREDENTIALS
  }
}

export function saveCredentials(credentials: Credentials): void {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}
