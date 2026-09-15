import type { RegisteredTool, ToolParameterSchema } from '@/types/tools'
import type { GitHubClient } from '@/types/github'

const repoSchema: ToolParameterSchema = {
  type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' } }, required: ['owner', 'repo'], additionalProperties: false,
}
const fileSchema: ToolParameterSchema = {
  type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, path: { type: 'string' }, ref: { type: 'string' } }, required: ['owner', 'repo', 'path'], additionalProperties: false,
}
const prNumberSchema: ToolParameterSchema = {
  type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, number: { type: 'integer', minimum: 1 } }, required: ['owner', 'repo', 'number'], additionalProperties: false,
}

function permission(action: 'github.read' | 'github.write') {
  return { permissionAction: action }
}

export function createGitHubTools(client: GitHubClient): RegisteredTool[] {
  const read = (name: string, description: string, inputSchema: ToolParameterSchema, executor: (input: any, context: any) => Promise<unknown>): RegisteredTool => ({
    definition: { name, description, inputSchema, requiresPermission: true, metadata: permission('github.read') }, executor: { execute: executor },
  })
  const write = (name: string, description: string, inputSchema: ToolParameterSchema, executor: (input: any, context: any) => Promise<unknown>): RegisteredTool => ({
    definition: { name, description, inputSchema, dangerous: true, requiresPermission: true, metadata: permission('github.write') }, executor: { execute: executor },
  })

  return [
    read('github.get_repository', 'Get repository metadata.', repoSchema, (i, c) => client.getRepository(i.owner, i.repo, c.signal)),
    read('github.list_branches', 'List repository branches.', repoSchema, (i, c) => client.listBranches(i.owner, i.repo, c.signal)),
    read('github.get_file', 'Read a text file from a repository.', fileSchema, (i, c) => client.getFile(i.owner, i.repo, i.path, i.ref, c.signal)),
    read('github.search_code', 'Search code across GitHub repositories using the configured token.', { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 500 } }, required: ['query'], additionalProperties: false }, (i, c) => client.searchCode(i.query, c.signal)),
    write('github.create_branch', 'Create a branch from an exact commit SHA.', { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, branch: { type: 'string' }, sha: { type: 'string' } }, required: ['owner', 'repo', 'branch', 'sha'], additionalProperties: false }, (i, c) => client.createBranch(i.owner, i.repo, i.branch, i.sha, c.signal)),
    write('github.create_or_update_file', 'Create a file or update it only when the current blob SHA is supplied for an existing file.', { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' }, message: { type: 'string' }, branch: { type: 'string' }, sha: { type: 'string' } }, required: ['owner', 'repo', 'path', 'content', 'message', 'branch'], additionalProperties: false }, (i, c) => client.createOrUpdateFile(i.owner, i.repo, i.path, i.content, i.message, i.branch, i.sha, c.signal)),
    write('github.create_pull_request', 'Create a pull request. This tool does not merge it.', { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, head: { type: 'string' }, base: { type: 'string' }, draft: { type: 'boolean' } }, required: ['owner', 'repo', 'title', 'head', 'base'], additionalProperties: false }, (i, c) => client.createPullRequest(i.owner, i.repo, { title: i.title, body: i.body, head: i.head, base: i.base, draft: i.draft }, c.signal)),
    read('github.get_pull_request', 'Get pull request metadata.', prNumberSchema, (i, c) => client.getPullRequest(i.owner, i.repo, i.number, c.signal)),
    write('github.create_issue', 'Create a GitHub issue.', { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } }, assignees: { type: 'array', items: { type: 'string' } } }, required: ['owner', 'repo', 'title'], additionalProperties: false }, (i, c) => client.createIssue(i.owner, i.repo, { title: i.title, body: i.body, labels: i.labels, assignees: i.assignees }, c.signal)),
    read('github.get_issue', 'Get a GitHub issue.', { ...prNumberSchema }, (i, c) => client.getIssue(i.owner, i.repo, i.number, c.signal)),
  ]
}
