// @ts-nocheck\nimport 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProviderConfig, AIProviderKind } from '@/types/ai'
import { decryptSecret } from '@/lib/security/encryption'

const defaults:Record<string,{baseUrl:string;kind:AIProviderKind}> = {
  openrouter:{baseUrl:'https://openrouter.ai/api/v1',kind:'openrouter'},
  openai:{baseUrl:'https://api.openai.com/v1',kind:'openai-compatible'},
  anthropic:{baseUrl:'https://api.anthropic.com',kind:'anthropic-compatible'},
  custom:{baseUrl:'',kind:'openai-compatible'},
}

export async function userAIProviders(client:SupabaseClient,userId:string):Promise<AIProviderConfig[]>{
  const {data,error}=await client.from('api_credentials').select('id,name,provider,base_url,model,encrypted_key,enabled,priority,metadata').eq('user_id',userId).eq('enabled',true).order('priority',{ascending:true})
  if(error) throw new Error(`API credentials lookup failed: ${error.message}`)
  return (data??[]).flatMap((row:any)=>{
    try{
      const d=defaults[row.provider]??defaults.custom
      const baseUrl=(row.base_url||d.baseUrl).trim()
      const model=String(row.model||'').trim()
      if(!baseUrl||!model) return []
      return [{
        id:`user-api-${row.id}`,name:row.name,kind:d.kind,baseUrl:baseUrl.replace(/\/$/,''),
        apiKey:decryptSecret(row.encrypted_key),enabled:true,priority:Number(row.priority??100),
        timeoutMs:Number(process.env.AI_TIMEOUT_MS||120000),maxRetries:Number(process.env.AI_MAX_RETRIES||2),
        models:[{id:model,provider:`user-api-${row.id}`,displayName:model,enabled:true,free:false}],
      } satisfies AIProviderConfig]
    }catch(error){
      console.warn('[ai-router] ignored invalid stored API credential',{id:row.id,error:error instanceof Error?error.message:'unknown'})
      return []
    }
  })
}
