import {NextResponse} from 'next/server'
import {createHash} from 'node:crypto'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseAdminClient} from '@/lib/supabase/admin'
import {rateLimit} from '@/lib/security/rate-limit'
export const runtime='nodejs'
const hash=(v:string)=>createHash('sha256').update(v).digest('hex')
export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}))
  const email=String(body?.email??'').trim().toLowerCase()
  const password=String(body?.password??'')
  if(body?.honeypot)return NextResponse.json({error:'Credenciais inválidas.'},{status:401})
  if(!email||!password)return NextResponse.json({error:'E-mail e senha são obrigatórios.'},{status:400})
  const ip=(request.headers.get('x-forwarded-for')??request.headers.get('x-real-ip')??'unknown').split(',')[0].trim()
  const emailHash=hash(email),ipHash=hash(ip)
  const rl=rateLimit(ipHash+':login',8,10*60*1000)
  if(!rl.allowed)return NextResponse.json({error:'Muitas tentativas. Aguarde alguns minutos.'},{status:429,headers:{'Retry-After':String(Math.ceil((rl.resetAt-Date.now())/1000))}})
  const admin=createSupabaseAdminClient()
  const {data:recent}=await admin.from('auth_attempts').select('id').eq('email_hash',emailHash).eq('success',false).gt('created_at',new Date(Date.now()-15*60*1000).toISOString()).limit(20)
  if((recent??[]).length>=12){try{const users=await admin.auth.admin.listUsers({page:1,perPage:1000});const target=users.data?.users?.find((u:any)=>String(u.email??'').toLowerCase()===email);if(target)await admin.from('account_suspensions').insert({user_id:target.id,reason:'Credential stuffing protection: repeated failed login attempts',source:'automatic',starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+30*60*1000).toISOString(),active:true,metadata:{ip_hash:ipHash}})}catch{}return NextResponse.json({error:'Login temporariamente bloqueado por tentativas suspeitas.'},{status:429})}
  const supabase=await createSupabaseServerClient()
  const {data,error}=await supabase.auth.signInWithPassword({email,password})
  await admin.from('auth_attempts').insert({email_hash:emailHash,ip_hash:ipHash,success:!error,reason:error?.code??null})
  if(error)return NextResponse.json({error:error.code==='email_not_confirmed'?'Confirme seu e-mail antes de entrar.':'E-mail ou senha inválidos.'},{status:401})
  const {data:factors}=await supabase.auth.mfa.listFactors()
  const verified=(factors?.all??[]).filter((f:any)=>f.status==='verified')
  const {data:aal}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return NextResponse.json({ok:true,userId:data.user?.id,needsMfa:Boolean(verified.length&&aal?.currentLevel!=='aal2')})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Falha no login.'},{status:500})}
}
