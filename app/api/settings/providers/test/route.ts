import {NextResponse} from 'next/server'
import {requireUser} from '@/lib/supabase/server'
import {userAIProviders} from '@/lib/ai/user-providers'
import {generateAI} from '@/lib/ai'
export const runtime='nodejs'
export async function POST(request:Request){
 try{
  const {user,supabase}=await requireUser()
  const body=await request.json().catch(()=>({}))
  const id=String(body?.id??'')
  if(!id)return NextResponse.json({error:'API inválida.'},{status:400})
  const target='user-api-'+id
  const providers=(await userAIProviders(supabase,user.id)).filter(p=>p.id===target)
  if(!providers.length)return NextResponse.json({error:'API não encontrada ou desligada.'},{status:404})
  const response=await generateAI({model:providers[0].models[0].id,maxTokens:16,temperature:0,messages:[{role:'user',content:'Responda somente: OK'}],metadata:{userId:user.id,source:'provider-test'}},providers)
  return NextResponse.json({ok:true,provider:response.provider,model:response.model,latencyMs:response.latencyMs,usage:response.usage},{headers:{'Cache-Control':'no-store'}})
 }catch(e){const m=e instanceof Error?e.message:'Falha ao testar API.';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:422})}
}
