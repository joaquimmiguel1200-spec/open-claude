import type { ToolDefinition, ToolExecutionContext, ToolPermissionChecker } from '@/types/tools'
import type { PermissionAction } from '@/types/permissions'
import type { PermissionEngine } from './permission-engine'

function actionForTool(tool: ToolDefinition): PermissionAction {
  const explicit = tool.metadata?.permissionAction
  if (typeof explicit === 'string') return explicit as PermissionAction
  return 'tool.execute'
}

export function createToolPermissionChecker(engine: PermissionEngine): ToolPermissionChecker {
  return {
    async authorize(tool, context: ToolExecutionContext) {
      return engine.authorize({
        action: actionForTool(tool),
        toolName: tool.name,
        resource: typeof tool.metadata?.resource === 'string' ? tool.metadata.resource : undefined,
        userId: context.userId,
        projectId: context.projectId,
        chatId: context.chatId,
        runId: context.runId,
        metadata: context.metadata,
      })
    },
  }
}
