// @ts-nocheck
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { assertEncryptionConfigured, encryptSecret } from '@/lib/security/encryption'
function validUrl(value:string,provider:string){
 try{
  const u=new URL(value)
  if(u.username||u.password)return false
  const production=process.env.NODE_ENV==='production'
  if(production&&u.protocol!=='https:')return false
  if(!production&&u.protocol!=='https:'&&u.protocol!=='http:')return false
  const host=u.hostname.toLowerCase().replace(/\.$/,'')
  if(production&&(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host==='metadata.google.internal'||/^\d{1,3}(\.\d{1,3}){3}$/.test(host)||host.startsWith('[')))return false
  const official:Record<string,string>={openrouter:'openrouter.ai',openai:'api.openai.com',anthropic:'api.anthropic.com'}
  if(provider!=='custom'&&official[provider]&&host!==official[provider])return false
  return true
 }catch{return false}
}
export async function GET(){try{const {user,supabase}=await requireUser();const {data,error}=await supabase.from('api_credentials').select('id,name,provider,base_url,model,enabled,priority,key_last4,created_at').eq('user_id',user.id).order('priority',{ascending:true});if(error)throw error;return NextResponse.json({providers:(data??[]).map((x:any)=>({...x,keyLast4:x.key_last4,baseUrl:x.base_url??''}))})}catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='UNAUTHENTICATED'?'Não autenticado.':'Falha ao carregar APIs.'},{status:e instanceof Error&&e.message==='UNAUTHENTICATED'?401:500})}}
export async function POST(request:Request){try{const {user,supabase}=await requireUser();const body=await request.json() as any;const name=String(body.name??'').trim(),provider=String(body.provider??'').trim(),model=String(body.model??'').trim(),baseUrl=String(body.baseUrl??'').trim(),key=String(body.key??'').trim();if(!name||!model||!key||!['openrouter','openai','anthropic','custom'].includes(provider)||!validUrl(baseUrl,provider)||name.length>80||model.length>200||key.length>8192||baseUrl.length>500)return NextResponse.json({error:'Dados da API inválidos.'},{status:400});try{assertEncryptionConfigured()}catch{return NextResponse.json({error:'A criptografia de credenciais não está configurada no servidor.'},{status:503})}const {data:maxRows}=await supabase.from('api_credentials').select('priority').eq('user_id',user.id).order('priority',{ascending:false}).limit(1);const priority=Number(maxRows?.[0]?.priority??0)+10;const {data,error}=await supabase.from('api_credentials').insert({user_id:user.id,name,provider,model,base_url:baseUrl,encrypted_key:encryptSecret(key),key_last4:key.slice(-4),priority,enabled:true}).select('id,name,provider,base_url,model,enabled,priority,key_last4').single();if(error)throw error;return NextResponse.json({provider:{...data,keyLast4:data.key_last4,baseUrl:data.base_url}})}catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='UNAUTHENTICATED'?'Não autenticado.':e instanceof Error?e.message:'Falha ao adicionar API.'},{status:e instanceof Error&&e.message==='UNAUTHENTICATED'?401:400})}}
export async function PATCH(request:Request){try{const {user,supabase}=await requireUser();const body=await request.json() as any;const id=String(body.id??'');const patch:any={};if(typeof body.enabled==='boolean')patch.enabled=body.enabled;if(Number.isFinite(Number(body.priority)))patch.priority=Math.max(1,Math.min(9999,Number(body.priority)));if(!id||!Object.keys(patch).length)return NextResponse.json({error:'Atualização inválida.'},{status:400});const {error}=await supabase.from('api_credentials').update(patch).eq('id',id).eq('user_id',user.id);if(error)throw error;return NextResponse.json({ok:true})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Falha ao atualizar API.'},{status:400})}}
export async function DELETE(request:Request){try{const {user,supabase}=await requireUser();const body=await request.json() as any;const {error}=await supabase.from('api_credentials').delete().eq('id',String(body.id??'')).eq('user_id',user.id);if(error)throw error;return NextResponse.json({ok:true})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Falha ao excluir API.'},{status:400})}}
