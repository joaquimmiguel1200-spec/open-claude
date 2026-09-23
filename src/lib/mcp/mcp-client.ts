import 'server-only'
import { spawn, type ChildProcess } from 'node:child_process'
import type { MCPCallContext, MCPClient, MCPPrompt, MCPPromptResult, MCPResource, MCPResourceReadResult, MCPServerConfig, MCPServerState, MCPTool, MCPToolCall, MCPToolResult } from '@/types/mcp'

type JsonRpc = { jsonrpc:'2.0'; id?:number|string|null; method?:string; params?:unknown; result?:any; error?:{code:number;message:string;data?:unknown} }
interface Session { config:MCPServerConfig; process?:ChildProcess; nextId:number; pending:Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>; buffer:string; state:MCPServerState }

const DEFAULT_TIMEOUT=30000
function timeout(ms:number,signal?:AbortSignal){ return new Promise<never>((_,reject)=>{const t=setTimeout(()=>reject(new Error('MCP request timed out.')),ms); signal?.addEventListener('abort',()=>{clearTimeout(t);reject(new Error('MCP request cancelled.'))},{once:true})}) }

export function createMCPClient(): MCPClient {
  const sessions=new Map<string,Session>()
  const request=async(s:Session,method:string,params:unknown,signal?:AbortSignal)=>{
    const id=s.nextId++
    const promise=new Promise<any>((resolve,reject)=>s.pending.set(id,{resolve,reject}))
    const message=JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n'
    if(s.process?.stdin){s.process.stdin.write(message)}else if(s.config.url){
      const response=await fetch(s.config.url,{method:'POST',headers:{'content-type':'application/json',...s.config.headers},body:message,signal})
      if(!response.ok) throw new Error(`MCP HTTP ${response.status}: ${response.statusText}`)
      const text=await response.text(); const parsed=JSON.parse(text) as JsonRpc
      if(parsed.error) throw new Error(parsed.error.message)
      return parsed.result
    } else throw new Error('MCP session has no transport.')
    return Promise.race([promise,timeout(s.config.timeoutMs??DEFAULT_TIMEOUT,signal)])
  }
  const sendNotification=(s:Session,method:string,params:unknown)=>{s.process?.stdin?.write(JSON.stringify({jsonrpc:'2.0',method,params})+'\n')}
  const connect=async(config:MCPServerConfig,signal?:AbortSignal):Promise<MCPServerState>=>{
    if(!config.name.trim()) throw new Error('MCP server name is required.')
    if(config.transport==='stdio' && !config.command) throw new Error('stdio MCP server requires command.')
    if(config.transport!=='stdio' && !config.url) throw new Error('HTTP MCP server requires url.')
    const state:MCPServerState={name:config.name,status:'connecting',tools:[],resources:[],prompts:[]}
    const s:Session={config,nextId:1,pending:new Map(),buffer:'',state}
    if(config.transport==='stdio'){
      const child=spawn(config.command!,config.args??[],{stdio:'pipe',shell:false,env:{...process.env,PATH:process.env.PATH??''}})
      s.process=child
      child.stdout?.on('data',(chunk:Buffer)=>{s.buffer+=chunk.toString();let i;while((i=s.buffer.indexOf('\n'))>=0){const line=s.buffer.slice(0,i).trim();s.buffer=s.buffer.slice(i+1);if(!line)continue;try{const msg=JSON.parse(line) as JsonRpc;if(msg.id!==undefined&&typeof msg.id==='number'){const p=s.pending.get(msg.id);if(p){s.pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result)}}}catch{}}})
      child.on('error',(e: Error)=>{state.status='failed';state.error=e.message})
      child.on('exit',()=>{if(state.status==='connected')state.status='failed'})
    }
    sessions.set(config.name,s)
    try{
      await request(s,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'open-claude',version:'1.0.0'}},signal)
      sendNotification(s,'notifications/initialized',{})
      state.status='connected'
      state.tools=await listTools(config.name); state.resources=await listResources(config.name); state.prompts=await listPrompts(config.name)
      return state
    }catch(e){state.status='failed';state.error=e instanceof Error?e.message:'MCP initialization failed';throw e}
  }
  const get=(name:string)=>{const s=sessions.get(name);if(!s)throw new Error(`MCP server not connected: ${name}`);return s}
  const disconnect=async(name:string)=>{const s=sessions.get(name);if(!s)return;s.process?.kill('SIGTERM');for(const p of s.pending.values())p.reject(new Error('MCP server disconnected.'));s.pending.clear();sessions.delete(name)}
  const listTools=async(name:string)=>{const s=get(name);const r=await request(s,'tools/list',{});return ((r?.tools??[]) as Array<any>).map(x=>({name:x.name,description:x.description,inputSchema:x.inputSchema??{},serverName:name}))}
  const listResources=async(name:string)=>{const s=get(name);const r=await request(s,'resources/list',{});return ((r?.resources??[]) as Array<any>).map(x=>({uri:x.uri,name:x.name,description:x.description,mimeType:x.mimeType,serverName:name}))}
  const listPrompts=async(name:string)=>{const s=get(name);const r=await request(s,'prompts/list',{});return ((r?.prompts??[]) as Array<any>).map(x=>({name:x.name,description:x.description,arguments:x.arguments,serverName:name}))}
  const callTool=async(call:MCPToolCall,context?:MCPCallContext):Promise<MCPToolResult>=>{try{const r=await request(get(call.serverName),'tools/call',{name:call.toolName,arguments:call.arguments},context?.signal);return {success:!r?.isError,content:r?.content??r,isError:r?.isError,error:r?.isError?'MCP tool returned an error.':undefined}}catch(e){return {success:false,content:null,error:e instanceof Error?e.message:'MCP tool call failed'}}}
  const readResource=async(name:string,uri:string,context?:MCPCallContext):Promise<MCPResourceReadResult>=>{try{return {success:true,content:(await request(get(name),'resources/read',{uri},context?.signal))}}catch(e){return {success:false,error:e instanceof Error?e.message:'MCP resource read failed'}}}
  const getPrompt=async(name:string,prompt:string,args?:Record<string,string>,context?:MCPCallContext):Promise<MCPPromptResult>=>{try{const r=await request(get(name),'prompts/get',{name:prompt,arguments:args??{}},context?.signal);return {success:true,messages:r?.messages??[]}}catch(e){return {success:false,error:e instanceof Error?e.message:'MCP prompt failed'}}}
  return {connect,disconnect,listTools,listResources,listPrompts,callTool,readResource,getPrompt}
}
