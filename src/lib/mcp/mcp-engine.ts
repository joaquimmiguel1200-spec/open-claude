import type { MCPClient, MCPServerConfig, MCPServerState, MCPTool } from '@/types/mcp'
import { ToolRegistry } from '@/lib/tools/tool-registry'

export interface MCPEngine { connect(config:MCPServerConfig):Promise<MCPServerState>; disconnect(name:string):Promise<void>; servers():MCPServerState[]; tools():MCPTool[]; registerTools(registry:ToolRegistry):void }

export function createMCPEngine(client:MCPClient):MCPEngine {
  const states=new Map<string,MCPServerState>()
  return {
    async connect(config){const state=await client.connect(config);states.set(config.name,state);return state},
    async disconnect(name){await client.disconnect(name);states.delete(name)},
    servers(){return [...states.values()]},
    tools(){return [...states.values()].flatMap(s=>s.tools)},
    registerTools(registry){
      for(const tool of [...states.values()].flatMap(s=>s.tools)){
        registry.register({name:`mcp.${tool.serverName}.${tool.name}`,description:tool.description??`MCP tool ${tool.name}`,inputSchema:{type:'object',properties:tool.inputSchema.properties as any,required:tool.inputSchema.required as string[]|undefined,additionalProperties:tool.inputSchema.additionalProperties as boolean|undefined},requiresPermission:true,metadata:{permissionAction:'tool.execute',mcpServer:tool.serverName,mcpTool:tool.name}},async(input,context)=>client.callTool({serverName:tool.serverName,toolName:tool.name,arguments:(input??{}) as Record<string,unknown>},{userId:context.userId,projectId:context.projectId,chatId:context.chatId,runId:context.runId,signal:context.signal}))
      }
    }
  }
}
