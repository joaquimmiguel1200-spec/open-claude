import { NextResponse } from 'next/server'
import { generateAI, streamAIResponse } from '@/lib/ai'
import { userAIProviders } from '@/lib/ai/user-providers'
import type { AIRoutingStrategy } from '@/types/ai'
import { requireUser } from '@/lib/supabase/server'
import { chatInputSchema, rejectBotHoneypot } from '@/lib/security/input'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'
import { createPersistence } from '@/lib/supabase/persistence'
import { retrieveMemories, captureMemories } from '@/lib/memory/memory-engine'
import { buildContextRequest } from '@/lib/context/context-engine'
import { matchSkills } from '@/lib/skills/skill-loader'

export const runtime='nodejs'
const routingStrategies:AIRoutingStrategy[]=['auto','quality','cost','latency','free']
function configuredStrategy():AIRoutingStrategy{const value=process.env.AI_ROUTING_STRATEGY?.trim() as AIRoutingStrategy|undefined;return value&&routingStrategies.includes(value)?value:'free'}

async function activeSkillInstructions(supabase:any,userId:string,query:string){
  const {data:skills}=await supabase.from('skills').select('id,name,description,instructions,enabled,tags').or(`owner_id.is.null,owner_id.eq.${userId}`).eq('enabled',true)
  if(!skills?.length)return []
  const {data:overrides}=await supabase.from('user_skills').select('skill_id,enabled').eq('user_id',userId)
  const disabled=new Set((overrides??[]).filter((x:any)=>x.enabled===false).map((x:any)=>x.skill_id))
  const active=skills.filter((s:any)=>!disabled.has(s.id))
  const matches=matchSkills(active.map((s:any)=>({...s,source:s.owner_id?'user':'builtin'})),query,5)
  return matches.map(x=>`SKILL: ${x.skill.name}\nDESCRIPTION: ${x.skill.description}\nINSTRUCTIONS:\n${x.skill.instructions}`)
}

export async function POST(request:Request){
 try{
  const {user,supabase}=await requireUser()
  const limit=rateLimit(clientKey(request,user.id),20,60000)
  if(!limit.allowed)return NextResponse.json({error:'Muitas solicitações. Tente novamente em instantes.'},{status:429,headers:{'Retry-After':String(Math.ceil((limit.resetAt-Date.now())/1000))}})
  const body:unknown=await request.json()
  const parsed=chatInputSchema.safeParse(body)
  if(!parsed.success||rejectBotHoneypot(parsed.data?.honeypot))return NextResponse.json({error:'Requisição inválida.'},{status:400})
  const persistence=createPersistence(supabase)
  const chat=parsed.data.chatId?(await supabase.from('chats').select('*').eq('id',parsed.data.chatId).eq('owner_id',user.id).single()).data:await persistence.getOrCreateChat(user.id,parsed.data.projectId??null,parsed.data.message.slice(0,80),parsed.data.model)
  if(!chat)return NextResponse.json({error:'Chat não encontrado ou não autorizado.'},{status:404})
  if(parsed.data.projectId&&chat.project_id&&chat.project_id!==parsed.data.projectId)return NextResponse.json({error:'Projeto não autorizado.'},{status:403})
  const recent=await persistence.recentMessages(chat.id,40)
  const memories=await retrieveMemories({userId:user.id,projectId:chat.project_id,chatId:chat.id,text:parsed.data.message,limit:12},persistence.memoryStore)
  const ragResults=await persistence.searchChunks(user.id,parsed.data.message,8)
  const skillInstructions=await activeSkillInstructions(supabase,user.id,parsed.data.message)
  const context=buildContextRequest({recentMessages:recent as any,memories,ragResults,systemInstructions:skillInstructions},{messages:[{role:'user',content:parsed.data.message}],model:parsed.data.model,strategy:configuredStrategy(),stream:true,signal:request.signal,metadata:{userId:user.id,chatId:chat.id,projectId:chat.project_id}})
  await persistence.appendMessage({chatId:chat.id,userId:user.id,role:'user',content:parsed.data.message,metadata:{projectId:chat.project_id}})
  const providers=await userAIProviders(supabase,user.id)
  const wantsStream=request.headers.get('accept')?.includes('text/event-stream')||parsed.data.stream===true
  if(!wantsStream){
   const response=await generateAI({...context.request,stream:false},providers)
   await persistence.appendMessage({chatId:chat.id,userId:user.id,role:'assistant',content:response.content,metadata:{model:response.model,usage:response.usage,cost:response.cost}})
   await captureMemories({userId:user.id,projectId:chat.project_id,chatId:chat.id,turn:{role:'user',content:parsed.data.message}},persistence.memoryStore)
   await persistence.audit({userId:user.id,projectId:chat.project_id,action:'chat.message',resourceType:'chat',resourceId:chat.id})
   return NextResponse.json({id:response.id,chatId:chat.id,content:response.content.trim(),model:response.model,usage:response.usage,cost:response.cost},{headers:{'Cache-Control':'no-store'}})
  }
  const encoder=new TextEncoder();let assistant=''
  const stream=new ReadableStream<Uint8Array>({async start(controller){try{for await(const event of streamAIResponse(context.request,providers)){if(event.type==='delta')assistant+=event.delta??'';controller.enqueue(encoder.encode(`data: ${JSON.stringify({...event,chatId:chat.id})}\n\n`))}if(assistant)await persistence.appendMessage({chatId:chat.id,userId:user.id,role:'assistant',content:assistant,metadata:{model:parsed.data.model??null}});if(assistant)await captureMemories({userId:user.id,projectId:chat.project_id,chatId:chat.id,turn:{role:'user',content:parsed.data.message}},persistence.memoryStore);await persistence.audit({userId:user.id,projectId:chat.project_id,action:'chat.message',resourceType:'chat',resourceId:chat.id});controller.close()}catch(error){const message=error instanceof Error?error.message:'AI stream failed.';controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:'error',error:{code:'INTERNAL',message,retryable:false}})}\n\n`));controller.close()}}})
  return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate',Connection:'keep-alive','X-Accel-Buffering':'no-store'}})
 }catch(error){
  const message=error instanceof Error?error.message:'Não foi possível processar a solicitação.'
  console.error('[chat] request failed',{message})
  const safe=message.includes('API credentials')||message.includes('Message save')||message.includes('Chat ')||message.includes('Memory ')||message.includes('History ')||message.includes('provider')||message.includes('AI')?message:'Não foi possível processar a solicitação.'
  return NextResponse.json({error:safe},{status:message==='UNAUTHENTICATED'?401:500})
 }
}