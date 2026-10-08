import 'server-only'
import { Sandbox } from '@vercel/sandbox'
import type { SandboxRunRequest, SandboxRunResult, SandboxRunner } from '@/types/sandbox'

const MAX_OUTPUT=64_000
const safePath=(p:string)=>{const n=p.replaceAll('\\','/');if(!n||n.startsWith('/')||n.includes('..')||n.startsWith('.git/'))throw new Error('Unsafe sandbox path: '+p);return n}
const safeEnv=(env:Record<string,string>|undefined)=>{for(const k of Object.keys(env??{})){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)||/(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY|SERVICE_ROLE|ACCESS_KEY|AUTH)/i.test(k))throw new Error('Sensitive sandbox environment variable forbidden: '+k)}}
export function createVercelSandboxRunner():SandboxRunner{
 return {async run(request:SandboxRunRequest,signal?:AbortSignal){
  if(!request.command.length)throw new Error('Sandbox command is required.')
  safeEnv(request.environment)
  const timeout=Math.max(5_000,Math.min(request.limits?.timeoutMs??120_000,10*60_000))
  const sandbox=await Sandbox.create({runtime:'node22',persistent:false,timeout,networkPolicy:request.allowNetwork?'allow-all':'deny-all',resources:{vcpus:Math.max(1,Math.min(request.limits?.cpus??1,4))}})
  const started=Date.now()
  try{
   await sandbox.writeFiles((request.files??[]).map(f=>({path:safePath(f.path),content:Buffer.from(f.content,'utf8')})))
   if(signal?.aborted){await sandbox.stop();return {status:'cancelled',exitCode:null,stdout:'',stderr:'',durationMs:Date.now()-started,timedOut:false,truncated:false}}
   const abort=()=>{void sandbox.stop()}
   signal?.addEventListener('abort',abort,{once:true})
   const result=await sandbox.runCommand({cmd:request.command[0],args:request.command.slice(1),cwd:request.workingDirectory??'/vercel/sandbox',env:request.environment})
   signal?.removeEventListener('abort',abort)
   let stdout=await result.stdout();let stderr=await result.stderr();let truncated=false
   if(stdout.length>MAX_OUTPUT){stdout=stdout.slice(0,MAX_OUTPUT);truncated=true}
   if(stderr.length>MAX_OUTPUT){stderr=stderr.slice(0,MAX_OUTPUT);truncated=true}
   const cancelled=signal?.aborted??false
   return {status:cancelled?'cancelled':result.exitCode===0?'completed':'failed',exitCode:result.exitCode,stdout,stderr,durationMs:Date.now()-started,timedOut:false,truncated}
  }catch(error){
   return {status:signal?.aborted?'cancelled':'failed',exitCode:null,stdout:'',stderr:error instanceof Error?error.message:'Sandbox execution failed.',durationMs:Date.now()-started,timedOut:false,truncated:false}
  }finally{await sandbox.stop().catch(()=>{})}
 }}
}
