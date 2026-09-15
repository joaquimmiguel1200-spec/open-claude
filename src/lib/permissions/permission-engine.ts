import { randomUUID } from 'node:crypto'
import type {
  PermissionAuditEvent,
  PermissionDecision,
  PermissionEngineOptions,
  PermissionPrompt,
  PermissionRequest,
  PermissionResolution,
  PermissionRule,
} from '@/types/permissions'

function matches(rule: PermissionRule, request: PermissionRequest, now: Date): boolean {
  if (rule.action !== request.action) return false
  if (rule.expiresAt && new Date(rule.expiresAt).getTime() <= now.getTime()) return false
  if (rule.toolName && rule.toolName !== request.toolName) return false
  if (rule.resource && rule.resource !== request.resource) return false
  if (rule.scope === 'project' && rule.resource && request.projectId && rule.resource !== request.projectId) return false
  return true
}

function specificity(rule: PermissionRule): number {
  let score = 0
  if (rule.toolName) score += 30
  if (rule.resource) score += 20
  if (rule.scope === 'session') score += 15
  if (rule.scope === 'project') score += 10
  if (rule.scope === 'user') score += 5
  return score
}

function rank(rules: PermissionRule[]): PermissionRule | undefined {
  const ordered = [...rules].sort((a, b) => specificity(b) - specificity(a))
  return ordered.find((rule) => rule.decision === 'deny') ?? ordered[0]
}

export function createPermissionEngine(options: PermissionEngineOptions = {}) {
  const now = options.now ?? (() => new Date())
  const audit: PermissionAuditEvent[] = []

  async function resolve(request: PermissionRequest): Promise<PermissionResolution> {
    const rules = options.store ? await options.store.listRules({ userId: request.userId, projectId: request.projectId }) : []
    const candidates = rules.filter((rule) => matches(rule, request, now()))
    const rule = rank(candidates)

    if (rule) {
      return { decision: rule.decision, rule, reason: rule.reason ?? `Matched ${rule.scope} permission rule.` }
    }

    return { decision: 'ask', reason: 'No matching permission rule exists; explicit approval is required.' }
  }

  async function check(request: PermissionRequest): Promise<PermissionResolution> {
    const resolution = await resolve(request)
    audit.push({ id: randomUUID(), timestamp: now().toISOString(), request, resolution })
    return resolution
  }

  async function authorize(request: PermissionRequest): Promise<boolean> {
    const resolution = await check(request)
    if (resolution.decision === 'allow') return true
    if (resolution.decision === 'deny') return false

    if (!options.onPrompt) return false
    const prompt: PermissionPrompt = {
      request,
      approve: async () => undefined,
      deny: async () => undefined,
    }
    const decision = await options.onPrompt(prompt)
    audit.push({ id: randomUUID(), timestamp: now().toISOString(), request, resolution: { ...resolution, decision, reason: decision === 'allow' ? 'User explicitly approved the action.' : 'User did not approve the action.' } })
    return decision === 'allow'
  }

  function listAudit(): PermissionAuditEvent[] {
    return [...audit]
  }

  async function grant(rule: Omit<PermissionRule, 'id' | 'createdAt'>): Promise<PermissionRule> {
    const created: PermissionRule = { ...rule, id: randomUUID(), createdAt: now().toISOString() }
    if (options.store) await options.store.addRule(created)
    return created
  }

  async function revoke(ruleId: string): Promise<boolean> {
    if (!options.store) return false
    return options.store.removeRule(ruleId)
  }

  return { resolve, check, authorize, grant, revoke, listAudit }
}

export type PermissionEngine = ReturnType<typeof createPermissionEngine>
