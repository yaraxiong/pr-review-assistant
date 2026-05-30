export const BUILTIN_MODELS = ['deepseek', 'kimi', 'qwen'] as const

export type BuiltInModel = (typeof BUILTIN_MODELS)[number]

export interface CustomConfig {
  id: string
  alias: string
  baseURL: string
  modelName: string
  apiKey: string
}

export interface CredentialsStorage {
  activeModel: BuiltInModel | string
  fixedKeys: Record<BuiltInModel, string>
  customConfigs: CustomConfig[]
}

export const CREDENTIALS_STORAGE_KEY = 'pr_assistant_credentials'

export const DEFAULT_CREDENTIALS: CredentialsStorage = {
  activeModel: 'deepseek',
  fixedKeys: {
    deepseek: '',
    kimi: '',
    qwen: '',
  },
  customConfigs: [],
}

const DEFAULT_CUSTOM_ENDPOINT = {
  baseURL: 'https://api.openai.com/v1/chat/completions',
  modelName: 'gpt-4o-mini',
}

export function isBuiltInModel(modelId: string): modelId is BuiltInModel {
  return (BUILTIN_MODELS as readonly string[]).includes(modelId)
}

export function generateCustomConfigId(): string {
  return crypto.randomUUID()
}

export function createEmptyCustomConfigForm(): Omit<CustomConfig, 'id'> {
  return {
    alias: '',
    baseURL: DEFAULT_CUSTOM_ENDPOINT.baseURL,
    modelName: DEFAULT_CUSTOM_ENDPOINT.modelName,
    apiKey: '',
  }
}

function normalizeCredentials(data: Partial<CredentialsStorage>): CredentialsStorage {
  const fixedKeys = {
    ...DEFAULT_CREDENTIALS.fixedKeys,
    ...data.fixedKeys,
  }

  const customConfigs = (data.customConfigs ?? [])
    .filter(
      (item): item is CustomConfig =>
        Boolean(item?.id && item?.alias && item?.baseURL && item?.modelName),
    )
    .map((item) => ({
      id: item.id,
      alias: item.alias,
      baseURL: item.baseURL,
      modelName: item.modelName,
      apiKey: item.apiKey ?? '',
    }))

  let activeModel = data.activeModel ?? DEFAULT_CREDENTIALS.activeModel

  if (activeModel === 'custom') {
    activeModel = customConfigs[0]?.id ?? DEFAULT_CREDENTIALS.activeModel
  }

  const isValidActiveModel =
    isBuiltInModel(activeModel) || customConfigs.some((item) => item.id === activeModel)

  return {
    activeModel: isValidActiveModel ? activeModel : DEFAULT_CREDENTIALS.activeModel,
    fixedKeys,
    customConfigs,
  }
}

function migrateLegacyCredentials(parsed: Record<string, unknown>): CredentialsStorage {
  const legacyKeys = parsed.keys as Record<string, string> | undefined
  const fixedKeys = {
    deepseek: legacyKeys?.deepseek ?? '',
    kimi: legacyKeys?.kimi ?? '',
    qwen: legacyKeys?.qwen ?? '',
  }

  const customConfigs: CustomConfig[] = []
  let activeModel = String(parsed.activeModel ?? 'deepseek')

  const legacyCustomConfig = parsed.customConfig as
    | { baseURL?: string; modelName?: string }
    | undefined
  const legacyCustomKey = legacyKeys?.custom ?? ''

  if (legacyCustomConfig?.baseURL || legacyCustomKey || activeModel === 'custom') {
    const migratedId = generateCustomConfigId()
    customConfigs.push({
      id: migratedId,
      alias: '自定义网关',
      baseURL: legacyCustomConfig?.baseURL ?? DEFAULT_CUSTOM_ENDPOINT.baseURL,
      modelName: legacyCustomConfig?.modelName ?? DEFAULT_CUSTOM_ENDPOINT.modelName,
      apiKey: legacyCustomKey,
    })

    if (activeModel === 'custom') {
      activeModel = migratedId
    }
  }

  return normalizeCredentials({
    activeModel,
    fixedKeys,
    customConfigs,
  })
}

export function loadCredentials(): CredentialsStorage {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_CREDENTIALS
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>

    if (Array.isArray(parsed.customConfigs) && parsed.fixedKeys) {
      return normalizeCredentials(parsed as Partial<CredentialsStorage>)
    }

    return migrateLegacyCredentials(parsed)
  } catch {
    return DEFAULT_CREDENTIALS
  }
}

export function saveCredentials(credentials: CredentialsStorage): void {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}

export interface ResolvedModelCredentials {
  apiKey: string
  selectedModel: BuiltInModel | 'custom'
  endpoint?: { baseURL: string; modelName: string }
}

export function resolveActiveModelCredentials(
  credentials: CredentialsStorage,
): ResolvedModelCredentials | null {
  const { activeModel, fixedKeys, customConfigs } = credentials

  if (isBuiltInModel(activeModel)) {
    const apiKey = fixedKeys[activeModel]?.trim()
    if (!apiKey) {
      return null
    }
    return { apiKey, selectedModel: activeModel }
  }

  const custom = customConfigs.find((item) => item.id === activeModel)
  if (!custom) {
    return null
  }

  const apiKey = custom.apiKey.trim()
  const baseURL = custom.baseURL.trim()
  const modelName = custom.modelName.trim()

  if (!apiKey || !baseURL || !modelName) {
    return null
  }

  return {
    apiKey,
    selectedModel: 'custom',
    endpoint: { baseURL, modelName },
  }
}
