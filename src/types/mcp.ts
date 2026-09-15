export type MCPTransport = 'stdio' | 'sse' | 'streamable-http'
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'failed'
export interface MCPServerConfig { name:string; transport:MCPTransport; command?:string; args?:string[]; url?:string; headers?:Record<string,string>; enabled?:boolean; timeoutMs?:number }
export interface MCPTool { name:string; description?:string; inputSchema:Record<string,unknown>; serverName:string }
export interface MCPResource { uri:string; name?:string; description?:string; mimeType?:string; serverName:string }
export interface MCPPrompt { name:string; description?:string; arguments?:Array<{name:string;description?:string;required?:boolean}>; serverName:string }
export interface MCPServerState { name:string; status:MCPServerStatus; tools:MCPTool[]; resources:MCPResource[]; prompts:MCPPrompt[]; error?:string }
export interface MCPCallContext { userId?:string; projectId?:string; chatId?:string; runId?:string; signal?:AbortSignal }
export interface MCPToolCall { serverName:string; toolName:string; arguments:Record<string,unknown> }
export interface MCPToolResult { success:boolean; content:unknown; isError?:boolean; error?:string }
export interface MCPResourceReadResult { success:boolean; content?:unknown; error?:string }
export interface MCPPromptResult { success:boolean; messages?:unknown[]; error?:string }
export interface MCPClient { connect(config:MCPServerConfig,signal?:AbortSignal):Promise<MCPServerState>; disconnect(serverName:string):Promise<void>; listTools(serverName:string):Promise<MCPTool[]>; listResources(serverName:string):Promise<MCPResource[]>; listPrompts(serverName:string):Promise<MCPPrompt[]>; callTool(call:MCPToolCall,context?:MCPCallContext):Promise<MCPToolResult>; readResource(serverName:string,uri:string,context?:MCPCallContext):Promise<MCPResourceReadResult>; getPrompt(serverName:string,name:string,args?:Record<string,string>,context?:MCPCallContext):Promise<MCPPromptResult> }
