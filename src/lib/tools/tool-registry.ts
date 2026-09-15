import type { RegisteredTool, ToolDefinition, ToolExecutor } from '@/types/tools'

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>()

  register(definition: ToolDefinition, executor: ToolExecutor): void {
    const name = definition.name.trim()
    if (!name) throw new Error('Tool name is required.')
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(name)) throw new Error(`Invalid tool name: ${name}`)
    if (this.tools.has(name)) throw new Error(`Tool already registered: ${name}`)
    this.tools.set(name, { definition: { ...definition, name }, executor })
  }

  registerMany(tools: Array<{ definition: ToolDefinition; executor: ToolExecutor }>): void {
    for (const tool of tools) this.register(tool.definition, tool.executor)
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name)
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].map(({ definition }) => definition)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }
}
