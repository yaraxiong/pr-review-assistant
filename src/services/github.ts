const PR_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?(?:[?#].*)?$/i

const NOISE_FILE_PATTERN = /\.svg|\.lock|package-lock\.json|yarn\.lock/i

const RATE_LIMIT_MESSAGE = 'API 访问过于火爆触发限流，请稍后重试或配置 Token'

const GITHUB_JSON_HEADERS = { Accept: 'application/vnd.github+json' }

export interface PRContextData {
  meta: {
    owner: string
    repo: string
    pullNumber: number
  }
  localContext: {
    title: string
    body: string | null
    commitMessages: string[]
  }
  globalContext: {
    readme: string
    contributing: string
  }
  diff: string
}

interface GitHubPullResponse {
  title: string
  body: string | null
}

interface GitHubReadmeResponse {
  content: string
  encoding: string
}

interface GitHubContentResponse {
  content: string
  encoding: string
}

interface GitHubCommitResponse {
  commit: {
    message: string
  }
}

function parsePRUrl(prUrl: string): { owner: string; repo: string; pullNumber: number } {
  const match = prUrl.trim().match(PR_URL_PATTERN)
  if (!match) {
    throw new Error('无效的 GitHub PR 链接，格式应为：https://github.com/owner/repo/pull/123')
  }

  return {
    owner: match[1],
    repo: match[2],
    pullNumber: Number.parseInt(match[3], 10),
  }
}

function decodeBase64Utf8(base64: string): string {
  const normalized = base64.replace(/\n/g, '')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function throwIfRateLimited(response: Response): void {
  if (response.status === 403) {
    throw new Error(RATE_LIMIT_MESSAGE)
  }
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof Error && error.message === RATE_LIMIT_MESSAGE
}

function isNoiseFile(filePath: string): boolean {
  return NOISE_FILE_PATTERN.test(filePath)
}

function filterDiffNoise(rawDiff: string): string {
  if (!rawDiff.trim()) {
    return rawDiff
  }

  const sections = rawDiff.split(/(?=^diff --git )/m).filter(Boolean)

  return sections
    .filter((section) => {
      const headerMatch = section.match(/^diff --git a\/(.+?) b\/(.+)/)
      if (!headerMatch) {
        return true
      }
      const filePath = headerMatch[2] || headerMatch[1]
      return !isNoiseFile(filePath)
    })
    .join('')
}

async function fetchPullDetails(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<GitHubPullResponse> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`
  const response = await fetch(url, { headers: GITHUB_JSON_HEADERS })

  throwIfRateLimited(response)

  if (!response.ok) {
    throw new Error(`获取 PR 详情失败 (${response.status}): ${response.statusText}`)
  }

  return response.json() as Promise<GitHubPullResponse>
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`

  try {
    const response = await fetch(url, { headers: GITHUB_JSON_HEADERS })

    throwIfRateLimited(response)

    if (!response.ok) {
      return ''
    }

    const data = (await response.json()) as GitHubReadmeResponse
    if (data.encoding !== 'base64' || !data.content) {
      return ''
    }

    return decodeBase64Utf8(data.content)
  } catch (error) {
    if (isRateLimitError(error)) {
      throw error
    }
    return ''
  }
}

async function fetchContributing(owner: string, repo: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/CONTRIBUTING.md`

  try {
    const response = await fetch(url, { headers: GITHUB_JSON_HEADERS })

    throwIfRateLimited(response)

    if (!response.ok) {
      return ''
    }

    const data = (await response.json()) as GitHubContentResponse
    if (data.encoding !== 'base64' || !data.content) {
      return ''
    }

    return decodeBase64Utf8(data.content)
  } catch (error) {
    if (isRateLimitError(error)) {
      throw error
    }
    return ''
  }
}

async function fetchPullCommits(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/commits`

  try {
    const response = await fetch(url, { headers: GITHUB_JSON_HEADERS })

    throwIfRateLimited(response)

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as GitHubCommitResponse[]
    if (!Array.isArray(data)) {
      return []
    }

    return data
      .map((item) => item.commit?.message?.trim())
      .filter((message): message is string => Boolean(message))
  } catch (error) {
    if (isRateLimitError(error)) {
      throw error
    }
    return []
  }
}

async function fetchPullDiff(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3.diff' },
  })

  throwIfRateLimited(response)

  if (!response.ok) {
    throw new Error(`获取 PR Diff 失败 (${response.status}): ${response.statusText}`)
  }

  return response.text()
}

export const fetchPRContext = async (prUrl: string): Promise<PRContextData> => {
  try {
    const { owner, repo, pullNumber } = parsePRUrl(prUrl)

    const [pullDetails, readme, contributing, commitMessages, rawDiff] = await Promise.all([
      fetchPullDetails(owner, repo, pullNumber),
      fetchReadme(owner, repo),
      fetchContributing(owner, repo),
      fetchPullCommits(owner, repo, pullNumber),
      fetchPullDiff(owner, repo, pullNumber),
    ])

    return {
      meta: { owner, repo, pullNumber },
      localContext: {
        title: pullDetails.title,
        body: pullDetails.body,
        commitMessages,
      },
      globalContext: {
        readme,
        contributing,
      },
      diff: filterDiffNoise(rawDiff),
    }
  } catch (error) {
    if (isRateLimitError(error)) {
      throw error
    }

    if (isNetworkError(error)) {
      throw new Error(RATE_LIMIT_MESSAGE)
    }

    throw error
  }
}
