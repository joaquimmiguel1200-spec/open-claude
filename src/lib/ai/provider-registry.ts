// @ts-nocheck
import type { AIModel, AIProviderConfig, AIRoutingStrategy } from '@/types/ai'

export function rankModels(providers:AIProviderConfig[],strategy:AIRoutingStrategy='auto'):AIModel[]{const models=providers.filter(p=>p.enabled).flatMap(p=>p.models.filter(m=>m.enabled!==false));return [...models].sort((a,b)=>{if(strategy==='free')return Number(b.free)-Number(a.free);if(strategy==='cost'){const ac=(a.inputCostPerMillion??999999)+(a.outputCostPerMillion??999999),bc=(b.inputCostPerMillion??999999)+(b.outputCostPerMillion??999999);return ac-bc}if(strategy==='quality')return(b.contextWindow??0)-(a.contextWindow??0);return 0})}

const DEFAULT_OPENROUTER_MODEL='nvidia/nemotron-3-ultra-550b-a55b:free'
const DEFAULT_OPENROUTER_BASE_URL='https://openrouter.ai/api/v1'

function configuredModelIds():string[]{
  const raw=process.env.AI_MODELS?.trim()
  if(!raw)return[]
  try{
    const parsed=JSON.parse(raw)
    if(Array.isArray(parsed))return parsed.map((x:any)=>typeof x==='string'?x:String(x?.id??'')).map(x=>x.trim()).filter(Boolean)
  }catch{}
  return raw.split(',').map(x=>x.trim()).filter(Boolean)
}

function modelFromId(id:string):AIModel{
  return{id,provider:'omniroute',displayName:id,free:id.endsWith(':free')||id.includes(':free'),enabled:true}
}

export function createOmniRouteConfig():AIProviderConfig|null{
  if((process.env.AI_PROVIDER??'omniroute').trim().toLowerCase()!=='omniroute')return null
  if(process.env.OMNIROUTE_ENABLED==='false')return null
  const baseUrl=(process.env.OMNIROUTE_BASE_URL||DEFAULT_OPENROUTER_BASE_URL).trim()
  const rawModel=process.env.AI_MODEL?.trim()
  const configuredModel=(!rawModel||rawModel==='nvidia/nemotron-3-ultra-550b-a55b-20260604:free')?DEFAULT_OPENROUTER_MODEL:rawModel
  const ids=[configuredModel,...configuredModelIds()].filter((id,index,all)=>id&&all.indexOf(id)===index)
  const models=ids.map(modelFromId)
  return{id:'omniroute',name:'OmniRoute / OpenRouter',kind:'omniroute',baseUrl:baseUrl.replace(/\/$/,''),apiKeyEnv:'OMNIROUTE_API_KEY',enabled:true,priority:Number(process.env.AI_PROVIDER_PRIORITY||1000),timeoutMs:Number(process.env.AI_TIMEOUT_MS||120000),maxRetries:Number(process.env.AI_MAX_RETRIES||2),models}
}

export function configuredProviders(extra:AIProviderConfig[]=[]):AIProviderConfig[]{const omni=createOmniRouteConfig();return[...extra,...(omni?[omni]:[])].filter(p=>p.enabled).sort((a,b)=>a.priority-b.priority)}
