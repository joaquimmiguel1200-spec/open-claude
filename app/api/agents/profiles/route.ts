import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { rateLimit, clientKey } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
const modes = ['chat','code','cowork']
function parseOpenCode(markdown: string) {
  const source = markdown.trim()
  if (!source || source.length > 24000) throw new Error('O arquivo deve conter entre 1 e 24.000 caracteres.')
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  const front = match?.[1] ?? ''
  const instructions = (match?.[2] ?? source).trim()
  const field = (key: string) => front.match(new RegExp('^' + key + ':\\s*(?:["\']([^"\']+)["\']|([^\\n]+))\\s*$', 'mi'))?.slice(1).find(Boolean)?.trim() ?? ''
  const name = field('name') || 'Agente OpenCode importado'
  const description = field('description') || 'Agente importado do formato Markdown/OpenCode.'
  const model = field('model') || null
  if (!instructions || instructions.length > 20000) throw new Error('Instruções do agente inválidas.')
  return { name: name.slice(0,100), description: description.slice(0,500), instructions, model_id: model, source: 'opencode', modes }
}
export async function GET() {
  try {
    const {user,supabase}=await requireUser()
    const {data,error}=await supabase.from('agent_profiles').select('id,name,description,source,model_id,enabled,modes,created_at,updated_at').eq('user_id',user.id).order('created_at',{ascending:false})
    if(error)throw error
    return NextResponse.json({agents:data??[]},{headers:{'Cache-Control':'no-store'}})
  } catch(e) {
    const m=e instanceof Error?e.message:'Request failed'
    return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:m==='ACCOUNT_PENDING_APPROVAL'?403:500})
  }
}
export async function POST(request:Request) {
  try {
    const {user,supabase}=await requireUser()
    const limit=rateLimit(clientKey(request,user.id)+':agent-profiles',20,60000)
    if(!limit.allowed)return NextResponse.json({error:'Limite de importações atingido.'},{status:429})
    const body=await request.json().catch(()=>({}))
    const parsed=body?.format==='opencode'?parseOpenCode(String(body?.content??'')):{
      name:String(body?.name??'').trim().slice(0,100),
      description:String(body?.description??'').trim().slice(0,500),
      instructions:String(body?.instructions??'').trim(),
      model_id:typeof body?.modelId==='string'&&body.modelId.trim()?body.modelId.trim().slice(0,200):null,
      source:'manual',
      modes:Array.isArray(body?.modes)?body.modes.filter((m:string)=>modes.includes(m)):modes,
    }
    if(!parsed.name||!parsed.instructions||parsed.instructions.length>20000||!parsed.modes.length)return NextResponse.json({error:'Informe nome, instruções e pelo menos um modo.'},{status:400})
    const {data,error}=await supabase.from('agent_profiles').insert({user_id:user.id,...parsed,metadata:{importedAt:parsed.source==='opencode'?new Date().toISOString():null}}).select('id,name,description,source,model_id,enabled,modes').single()
    if(error)throw error
    return NextResponse.json({agent:data},{status:201,headers:{'Cache-Control':'no-store'}})
  } catch(e) {
    const m=e instanceof Error?e.message:'Request failed'
    return NextResponse.json({error:m==='UNAUTHENTICATED'?'Não autenticado.':m==='ACCOUNT_PENDING_APPROVAL'?'Aguardando aprovação administrativa.':m.includes('O arquivo')||m.includes('Instruções')?m:'Não foi possível importar o agente. Verifique se ele já existe.'},{status:m==='UNAUTHENTICATED'?401:m==='ACCOUNT_PENDING_APPROVAL'?403:400})
  }
}
export async function PATCH(request:Request) {
  try {
    const {user,supabase}=await requireUser()
    const b=await request.json().catch(()=>({}))
    const id=String(b?.id??'')
    const patch:Record<string,unknown>={}
    if(typeof b?.enabled==='boolean')patch.enabled=b.enabled
    if(typeof b?.modelId==='string')patch.model_id=b.modelId.trim().slice(0,200)||null
    if(Array.isArray(b?.modes))patch.modes=b.modes.filter((m:string)=>modes.includes(m))
    if(!/^[0-9a-f-]{36}$/i.test(id)||!Object.keys(patch).length)return NextResponse.json({error:'Atualização inválida.'},{status:400})
    patch.updated_at=new Date().toISOString()
    const {data,error}=await supabase.from('agent_profiles').update(patch).eq('id',id).eq('user_id',user.id).select('id').maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({error:'Agente não encontrado.'},{status:404})
    return NextResponse.json({ok:true})
  } catch(e) {
    const m=e instanceof Error?e.message:'Request failed'
    return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:m==='ACCOUNT_PENDING_APPROVAL'?403:500})
  }
}
export async function DELETE(request:Request) {
  try {
    const {user,supabase}=await requireUser()
    const b=await request.json().catch(()=>({}))
    const id=String(b?.id??'')
    if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Agente inválido.'},{status:400})
    const {data,error}=await supabase.from('agent_profiles').delete().eq('id',id).eq('user_id',user.id).select('id').maybeSingle()
    if(error)throw error
    if(!data)return NextResponse.json({error:'Agente não encontrado.'},{status:404})
    return NextResponse.json({ok:true})
  } catch(e) {
    const m=e instanceof Error?e.message:'Request failed'
    return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:m==='ACCOUNT_PENDING_APPROVAL'?403:500})
  }
}
