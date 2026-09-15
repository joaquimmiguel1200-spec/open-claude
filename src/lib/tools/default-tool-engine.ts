import { builtinTools } from './builtin-tools'
import { createToolEngine, type ToolEngineOptions } from './tool-engine'

export function createDefaultToolEngine(options: ToolEngineOptions = {}) {
  const engine = createToolEngine(options)
  engine.registry.registerMany(builtinTools)
  return engine
}
