import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { rateLimit, clientKey } from '@/lib/security/rate-limit'

export const runtime='nodejs'
const POLICY_VERSION='2026-10-07'
const policyTypes=['terms','privacy','security','cookies','acceptable_use','ai'] as const

export async function GET(request:Request){
  try{
    const {user,supabase}=await requireUser()
    const rl=rateLimit(clientKey(request,user.id),30,60000)
    if(!rl.allowed)return NextResponse.json({error:'Limite excedido.'},{status:429})
    const [profile,consents,alerts,requests,cookies,acceptances]=await Promise.all([
      supabase.from('profiles').select('id,display_name,avatar_url,created_at,updated_at').eq('id',user.id).maybeSingle(),
      supabase.from('privacy_consents').select('version,necessary,analytics,functional,marketing,accepted_at').eq('user_id',user.id).order('accepted_at',{ascending:false}).limit(1),
      supabase.from('security_alerts').select('id,type,severity,title,message,acknowledged_at,created_at').eq('user_id',user.id).is('acknowledged_at',null).order('created_at',{ascending:false}).limit(20),
      supabase.from('data_subject_requests').select('id,request_type,status,details,created_at,completed_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20),
      supabase.from('cookie_inventory').select('name,category,purpose,provider,duration,http_only,secure,same_site,active').eq('active',true).order('category'),
      supabase.from('policy_acceptances').select('policy_type,version,accepted_at').eq('user_id',user.id).order('accepted_at',{ascending:false}),
    ])
    const bad=[profile,consents,alerts,requests,cookies,acceptances].find(x=>x.error)
    if(bad?.error)throw new Error(bad.error.message)
    const {data:session}=await supabase.auth.getSession()
    return NextResponse.json({
      policyVersion:POLICY_VERSION,policyTypes,
      profile:profile.data,
      consent:consents.data?.[0]??null,
      alerts:alerts.data??[],
      requests:requests.data??[],
      cookies:cookies.data??[],
      acceptances:acceptances.data??[],
      currentSession:session.session?{userId:user.id,expiresAt:session.session.expires_at??null,accessTokenPresent:true}:null,
    },{headers:{'cache-control':'no-store'}})
  }catch(e){const m=e instanceof Error?e.message:'Falha ao carregar segurança.';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:500})}
}

export async function POST(request:Request){
  try{
    const {user,supabase}=await requireUser()
    const rl=rateLimit(clientKey(request,user.id),30,60000)
    if(!rl.allowed)return NextResponse.json({error:'Limite excedido.'},{status:429})
    const body=await request.json().catch(()=>({}))
    const action=String(body?.action??'')
    if(action==='consent'){
      const consent={user_id:user.id,version:POLICY_VERSION,necessary:true,analytics:Boolean(body.analytics),functional:Boolean(body.functional),marketing:Boolean(body.marketing),source:'settings',accepted_at:new Date().toISOString()}
      const r=await supabase.from('privacy_consents').upsert(consent,{onConflict:'user_id,version'})
      if(r.error)throw new Error(r.error.message)
      return NextResponse.json({ok:true})
    }
    if(action==='correction'){
      const displayName=String(body?.displayName??'').trim().slice(0,120)
      const avatarUrl=String(body?.avatarUrl??'').trim().slice(0,500)
      const r=await supabase.from('profiles').update({display_name:displayName||null,avatar_url:avatarUrl||null,updated_at:new Date().toISOString()}).eq('id',user.id)
      if(r.error)throw new Error(r.error.message)
      return NextResponse.json({ok:true})
    }
    if(action==='request'){
      const type=String(body?.type??'')
      if(!['access','correction','portability','deletion','restriction','subprocessor'].includes(type))return NextResponse.json({error:'Tipo de solicitação inválido.'},{status:400})
      const r=await supabase.from('data_subject_requests').insert({user_id:user.id,request_type:type,details:typeof body.details==='object'&&body.details?body.details:{}})
      if(r.error)throw new Error(r.error.message)
      return NextResponse.json({ok:true})
    }
    if(action==='report'){
      const category=String(body?.category??'').trim().slice(0,80)
      const description=String(body?.description??'').trim().slice(0,5000)
      if(!category||!description)return NextResponse.json({error:'Categoria e descrição são obrigatórias.'},{status:400})
      const r=await supabase.from('security_reports').insert({reporter_id:user.id,category,description})
      if(r.error)throw new Error(r.error.message)
      return NextResponse.json({ok:true})
    }
    if(action==='acknowledge'){
      const id=String(body?.id??'')
      const r=await supabase.from('security_alerts').update({acknowledged_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id)
      if(r.error)throw new Error(r.error.message)
      return NextResponse.json({ok:true})
    }
    if(action==='signoutOthers'){
      const {error}=await supabase.auth.signOut({scope:'others'})
      if(error)throw new Error(error.message)
      return NextResponse.json({ok:true})
    }
    if(action==='signoutAll'){
      const {error}=await supabase.auth.signOut({scope:'global'})
      if(error)throw new Error(error.message)
      return NextResponse.json({ok:true})
    }
    return NextResponse.json({error:'Ação inválida.'},{status:400})
  }catch(e){const m=e instanceof Error?e.message:'Falha de segurança.';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:500})}
}
