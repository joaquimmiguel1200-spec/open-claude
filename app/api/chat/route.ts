import { NextResponse } from 'next/server'
import { generateAI, streamAIResponse } from '@/src/lib/ai'
import type { AIRoutingStrategy } from '@/src/types/ai'
import { requireUser } from '@/src/lib/supabase/server'
import { chatInputSchema, rejectBotHoneypot } from '@/src/lib/security/input'
import { clientKey, rateLimit } from '@/src/lib/security/rate-limit'
import { createPersistence } from '@/src/lib/supabase/persistence'
import { retrieveMemories, captureMemories } from '@/src/lib/memory/memory-engine'
import { buildContextRequest } from '@/src/lib/context/context-engine'

export const runtime = 'nodejs'
const routingStrategies: AIRoutingStrategy[] = ['auto','quality','cost','latency','free']
function configuredStrategy(): AIRoutingStrategy { const value=process.env.AI_ROUTING_STRATEGY?.trim() as AIRoutingStrategy|undefined; return value&&routingStrategies.includes(value)?value:'free' }

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit=rateLimit(clientKey(request,user.id),20,60_000)
    if(!limit.allowed)return NextResponse.json({error:'Muitas solicitações. Tente novamente em instantes.'},{status:429,headers:{'Retry-After':String(Math.ceil((limit.resetAt-Date.now())/1000))}})
    const body:unknown=await request.json()
    const parsed=chatInputSchema.safeParse(body)
    if(!parsed.success||rejectBotHoneypot(parsed.data?.honeypot))return NextResponse.json({error:'Requisição inválida.'},{status:400})

    const persistence=createPersistence(supabase)
    const chat=parsed.data.chatId
      ? (await supabase.from('chats').select('*').eq('id',parsed.data.chatId).eq('owner_id',user.id).single()).data
      : await persistence.getOrCreateChat(user.id,parsed.data.projectId??null,parsed.data.message.slice(0,80),parsed.data.model)
    if(!chat)return NextResponse.json({error:'Chat não encontrado ou não autorizado.'},{status:404})
    if(parsed.data.projectId && chat.project_id && chat.project_id!==parsed.data.projectId)return NextResponse.json({error:'Projeto não autorizado.'},{status:403})

    const recent=await persistence.recentMessages(chat.id,40)
    const memories=await retrieveMemories({userId:user.id,projectId:chat.project_id,chatId:chat.id,text:parsed.data.message,limit:12},persistence.memoryStore)
    const ragResults=await persistence.searchChunks(user.id,parsed.data.message,8)
    const context=buildContextRequest(
      {recentMessages:recent as any,memories,ragResults},
      {messages:[{role:'user',content:parsed.data.message}],model:parsed.data.model,strategy:configuredStrategy(),stream:true,signal:request.signal,metadata:{userId:user.id,chatId:chat.id,projectId:chat.project_id}}
    )
    await persistence.appendMessage({chatId:chat.id,userId:user.id,role:'user',content:parsed.data.message,metadata:{projectId:chat.project_id}})

    const wantsStream=request.headers.get('accept')?.includes('text/event-stream')||parsed.data.stream===true
    if(!wantsStream){
      const response=await generateAI({...context.request,stream:false})
      await persistence.appendMessage({chatId:chat.id,userId:user.id,role:'assistant',content:response.content,metadata:{model:response.model,usage:response.usage,cost:response.cost}})
      await captureMemories({userId:user.id,projectId:chat.project_id,chatId:chat.id,turn:{role:'user',content:parsed.data.message}},persistence.memoryStore)
      await persistence.audit({userId:user.id,projectId:chat.project_id,action:'chat.message',resourceType:'chat',resourceId:chat.id})
      return NextResponse.json({id:response.id,chatId:chat.id,content:response.content.trim(),model:response.model,usage:response.usage,cost:response.cost},{headers:{'Cache-Control':'no-store'}})
    }

    const encoder=new TextEncoder(); let assistant=''
    const stream=new ReadableStream<Uint8Array>({
      async start(controller){
        try{
          for await(const event of streamAIResponse(context.request)){
            if(event.type==='delta')assistant+=event.delta??''
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({...event,chatId:chat.id})}\\n\\n`))
          }
          if(assistant) {
            await persistence.appendMessage({chatId:chat.id,userId:user.id,role:'assistant',content:assistant,metadata:{model:parsed.data.model??null}})
            await captureMemories({userId:user.id,projectId:chat.project_id,chatId:chat.id,turn:{role:'user',content:parsed.data.message}},persistence.memoryStore)
          }
          await persistence.audit({userId:user.id,projectId:chat.project_id,action:'chat.message',resourceType:'chat',resourceId:chat.id})
          controller.close()
        }catch(error){
          const message=error instanceof Error?error.message:'AI stream failed.'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({type:'error',error:{code:'INTERNAL',message,retryable:false}})}\\n\\n`)); controller.close()
        }
      }
    })
    return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate',Connection:'keep-alive','X-Accel-Buffering':'no-store'}})
  }catch(error){
    const message=error instanceof Error&&error.message==='UNAUTHENTICATED'?'Não autenticado.':'Não foi possível processar a solicitação.'
    return NextResponse.json({error:message},{status:message==='Não autenticado.'?401:500})
  }
}
