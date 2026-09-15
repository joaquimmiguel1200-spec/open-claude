import type {
  GitHubClient,
  GitHubClientOptions,
  GitHubCodeSearchResult,
  GitHubCreateIssueInput,
  GitHubCreatePullRequestInput,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepository,
  GitHubBranch,
  GitHubFile,
} from '@/types/github'

const DEFAULT_BASE_URL = 'https://api.github.com'
const DEFAULT_TIMEOUT_MS = 20_000

export class GitHubApiError extends Error {
  readonly status: number
  readonly retryable: boolean

  constructor(message: string, status: number, retryable = status === 429 || status >= 500) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.retryable = retryable
  }
}

function assertPart(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized || normalized.length > 200 || /[\\\s]/.test(normalized)) throw new Error(`Invalid GitHub ${label}.`)
  return normalized
}

function assertRepo(owner: string, repo: string) {
  return { owner: assertPart(owner, 'owner'), repo: assertPart(repo, 'repository') }
}

function assertNumber(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${label}.`)
}

function decodeContent(encoded: string): string {
  return Buffer.from(encoded.replace(/\s/g, ''), 'base64').toString('utf8')
}

function encodeContent(content: string): string {
  return Buffer.from(content, 'utf8').toString('base64')
}

export function createGitHubClient(options: GitHubClientOptions): GitHubClient {
  if (!options.token?.trim()) throw new Error('GITHUB_TOKEN is required for the GitHub Agent.')
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${options.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      })
      if (!response.ok) {
        let detail = response.statusText
        try {
          const body = await response.json() as { message?: string }
          detail = body.message ?? detail
        } catch {}
        throw new GitHubApiError(`GitHub API ${response.status}: ${detail}`, response.status)
      }
      return await response.json() as T
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new GitHubApiError('GitHub request timed out or was cancelled.', 408, true)
      throw error
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }

  return {
    async getRepository(owner, repo, signal) {
      const r = assertRepo(owner, repo)
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}`, {}, signal)
      return { id: data.id, fullName: data.full_name, name: data.name, owner: data.owner.login, defaultBranch: data.default_branch, private: data.private, htmlUrl: data.html_url } satisfies GitHubRepository
    },
    async listBranches(owner, repo, signal) {
      const r = assertRepo(owner, repo)
      const data = await request<any[]>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/branches?per_page=100`, {}, signal)
      return data.map((b) => ({ name: b.name, sha: b.commit.sha, protected: Boolean(b.protected) })) satisfies GitHubBranch[]
    },
    async getFile(owner, repo, path, ref, signal) {
      const r = assertRepo(owner, repo)
      const cleanPath = path.trim().replace(/^\/+/, '')
      if (!cleanPath || cleanPath.length > 1000) throw new Error('Invalid GitHub file path.')
      const query = ref ? `?ref=${encodeURIComponent(ref)}` : ''
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/contents/${cleanPath.split('/').map(encodeURIComponent).join('/')}${query}`, {}, signal)
      if (Array.isArray(data) || data.type !== 'file' || !data.content) throw new Error('GitHub path is not a text file.')
      return { path: data.path, sha: data.sha, size: data.size, content: decodeContent(data.content), encoding: 'utf-8', htmlUrl: data.html_url } satisfies GitHubFile
    },
    async searchCode(query, signal) {
      if (!query.trim()) throw new Error('Code search query is required.')
      const data = await request<any>(`/search/code?q=${encodeURIComponent(query.trim())}&per_page=50`, {}, signal)
      return { totalCount: data.total_count, truncated: false, items: (data.items ?? []).map((i: any) => ({ path: i.path, repository: i.repository.full_name, htmlUrl: i.html_url, sha: i.sha })) } satisfies GitHubCodeSearchResult
    },
    async createBranch(owner, repo, branch, sha, signal) {
      const r = assertRepo(owner, repo)
      if (!branch.trim() || !sha.trim()) throw new Error('Branch and source SHA are required.')
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch.trim()}`, sha: sha.trim() }) }, signal)
      return { name: data.ref.replace(/^refs\/heads\//, ''), sha: data.object.sha }
    },
    async createOrUpdateFile(owner, repo, path, content, message, branch, sha, signal) {
      const r = assertRepo(owner, repo)
      if (!path.trim() || !message.trim() || !branch.trim()) throw new Error('Path, commit message and branch are required.')
      if (sha === undefined) {
        try {
          const existing = await this.getFile(owner, repo, path, branch, signal)
          throw new Error(`Refusing blind overwrite of ${existing.path}; provide its current SHA.`)
        } catch (error) {
          if (error instanceof GitHubApiError && error.status === 404) { /* create */ } else throw error
        }
      }
      const body: Record<string, unknown> = { message: message.trim(), content: encodeContent(content), branch: branch.trim() }
      if (sha) body.sha = sha
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/contents/${path.trim().replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: JSON.stringify(body) }, signal)
      return { commitSha: data.commit.sha, contentSha: data.content.sha }
    },
    async createPullRequest(owner, repo, input: GitHubCreatePullRequestInput, signal) {
      const r = assertRepo(owner, repo)
      if (!input.title.trim() || !input.head.trim() || !input.base.trim()) throw new Error('PR title, head and base are required.')
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/pulls`, { method: 'POST', body: JSON.stringify(input) }, signal)
      return { number: data.number, title: data.title, state: data.state, draft: Boolean(data.draft), head: data.head.ref, base: data.base.ref, htmlUrl: data.html_url } satisfies GitHubPullRequest
    },
    async getPullRequest(owner, repo, number, signal) {
      const r = assertRepo(owner, repo); assertNumber(number, 'pull request number')
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/pulls/${number}`, {}, signal)
      return { number: data.number, title: data.title, state: data.state, draft: Boolean(data.draft), head: data.head.ref, base: data.base.ref, htmlUrl: data.html_url } satisfies GitHubPullRequest
    },
    async createIssue(owner, repo, input: GitHubCreateIssueInput, signal) {
      const r = assertRepo(owner, repo)
      if (!input.title.trim()) throw new Error('Issue title is required.')
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/issues`, { method: 'POST', body: JSON.stringify(input) }, signal)
      return { number: data.number, title: data.title, state: data.state, htmlUrl: data.html_url } satisfies GitHubIssue
    },
    async getIssue(owner, repo, number, signal) {
      const r = assertRepo(owner, repo); assertNumber(number, 'issue number')
      const data = await request<any>(`/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}/issues/${number}`, {}, signal)
      return { number: data.number, title: data.title, state: data.state, htmlUrl: data.html_url } satisfies GitHubIssue
    },
  }
}

export function createGitHubClientFromEnv(): GitHubClient {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not configured on the server.')
  return createGitHubClient({ token, baseUrl: process.env.GITHUB_API_URL })
}
