export interface GitHubRepository {
  id: number
  fullName: string
  name: string
  owner: string
  defaultBranch: string
  private: boolean
  htmlUrl: string
}

export interface GitHubBranch {
  name: string
  sha: string
  protected: boolean
}

export interface GitHubFile {
  path: string
  sha: string
  size: number
  content: string
  encoding: 'utf-8'
  htmlUrl?: string
}

export interface GitHubCodeSearchResult {
  totalCount: number
  truncated: boolean
  items: Array<{ path: string; repository: string; htmlUrl: string; sha: string }>
}

export interface GitHubPullRequest {
  number: number
  title: string
  state: string
  draft: boolean
  head: string
  base: string
  htmlUrl: string
}

export interface GitHubIssue {
  number: number
  title: string
  state: string
  htmlUrl: string
}

export interface GitHubCreatePullRequestInput {
  title: string
  body?: string
  head: string
  base: string
  draft?: boolean
}

export interface GitHubCreateIssueInput {
  title: string
  body?: string
  labels?: string[]
  assignees?: string[]
}

export interface GitHubClientOptions {
  token: string
  baseUrl?: string
  timeoutMs?: number
}

export interface GitHubClient {
  getRepository(owner: string, repo: string, signal?: AbortSignal): Promise<GitHubRepository>
  listBranches(owner: string, repo: string, signal?: AbortSignal): Promise<GitHubBranch[]>
  getFile(owner: string, repo: string, path: string, ref?: string, signal?: AbortSignal): Promise<GitHubFile>
  searchCode(query: string, signal?: AbortSignal): Promise<GitHubCodeSearchResult>
  createBranch(owner: string, repo: string, branch: string, sha: string, signal?: AbortSignal): Promise<{ name: string; sha: string }>
  createOrUpdateFile(owner: string, repo: string, path: string, content: string, message: string, branch: string, sha?: string, signal?: AbortSignal): Promise<{ commitSha: string; contentSha: string }>
  createPullRequest(owner: string, repo: string, input: GitHubCreatePullRequestInput, signal?: AbortSignal): Promise<GitHubPullRequest>
  getPullRequest(owner: string, repo: string, number: number, signal?: AbortSignal): Promise<GitHubPullRequest>
  createIssue(owner: string, repo: string, input: GitHubCreateIssueInput, signal?: AbortSignal): Promise<GitHubIssue>
  getIssue(owner: string, repo: string, number: number, signal?: AbortSignal): Promise<GitHubIssue>
}
