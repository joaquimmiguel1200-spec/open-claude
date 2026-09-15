export type PermissionDecision = 'allow' | 'deny' | 'ask'

export type PermissionScope = 'session' | 'project' | 'user' | 'global'

export type PermissionAction =
  | 'tool.execute'
  | 'file.read'
  | 'file.write'
  | 'network.request'
  | 'code.execute'
  | 'shell.execute'
  | 'github.read'
  | 'github.write'
  | 'account.change'

export interface PermissionRule {
  id: string
  action: PermissionAction
  resource?: string
  toolName?: string
  decision: PermissionDecision
  scope: PermissionScope
  expiresAt?: string
  reason?: string
  createdAt: string
}

export interface PermissionRequest {
  action: PermissionAction
  resource?: string
  toolName?: string
  userId?: string
  projectId?: string
  chatId?: string
  runId?: string
  metadata?: Record<string, unknown>
}

export interface PermissionResolution {
  decision: PermissionDecision
  rule?: PermissionRule
  reason: string
}

export interface PermissionAuditEvent {
  id: string
  timestamp: string
  request: PermissionRequest
  resolution: PermissionResolution
}

export interface PermissionStore {
  listRules(context?: { userId?: string; projectId?: string }): Promise<PermissionRule[]>
  addRule(rule: PermissionRule): Promise<void>
  removeRule(ruleId: string): Promise<boolean>
}

export interface PermissionPrompt {
  request: PermissionRequest
  approve: () => Promise<void>
  deny: () => Promise<void>
}

export interface PermissionEngineOptions {
  store?: PermissionStore
  onPrompt?: (prompt: PermissionPrompt) => Promise<PermissionDecision> | PermissionDecision
  now?: () => Date
}
