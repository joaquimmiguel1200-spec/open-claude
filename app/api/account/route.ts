import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'
export const runtime='nodejs'
async function exportAccount(userId:string){
 const {supabase}=await requireUser()
 const admin=createSupabaseAdminClient()
 const results=await Promise.all([
  supabase.from('profiles').select('id,display_name,avatar_url,preferences,created_at,updated_at').eq('id',userId).maybeSingle(),
  supabase.from('projects').select('*').eq('owner_id',userId),
  supabase.from('project_members').select('*').eq('user_id',userId),
  supabase.from('chats').select('*').eq('owner_id',userId),
  supabase.from('messages').select('*').eq('user_id',userId),
  supabase.from('files').select('*').eq('owner_id',userId),
  supabase.from('memories').select('*').eq('user_id',userId),
  supabase.from('memory_items').select('*').eq('user_id',userId),
  supabase.from('conversation_summaries').select('*').eq('user_id',userId),
  supabase.from('mcp_connections').select('id,user_id,project_id,name,server_url,transport,config,enabled,created_at,updated_at').eq('user_id',userId),
  supabase.from('github_connections').select('id,user_id,account_login,installation_id,scopes,metadata,created_at,updated_at').eq('user_id',userId),
  supabase.from('cowork_sessions').select('*').eq('owner_id',userId),
  supabase.from('permission_grants').select('*').eq('user_id',userId),
  supabase.from('artifacts').select('*').eq('owner_id',userId),
  supabase.from('rag_chunks').select('id,file_id,project_id,owner_id,chunk_index,content,token_count,metadata,embedding_model,embedding_status,embedding_error,content_hash,created_at,updated_at').eq('owner_id',userId),
  supabase.from('privacy_consents').select('*').eq('user_id',userId),
  supabase.from('policy_acceptances').select('*').eq('user_id',userId),
  supabase.from('data_subject_requests').select('*').eq('user_id',userId),
  supabase.from('security_reports').select('*').eq('reporter_id',userId),
  supabase.from('security_alerts').select('*').eq('user_id',userId),
  admin.from('subprocessor_deletion_jobs').select('*').eq('user_id',userId),
  supabase.from('audit_logs').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(5000),
  supabase.from('skills').select('*').eq('owner_id',userId),
  supabase.from('user_skills').select('*').eq('user_id',userId),
  supabase.from('api_credentials').select('id,user_id,name,provider,base_url,model,key_last4,enabled,priority,metadata,created_at,updated_at').eq('user_id',userId)
 ])
 const err=results.find(x=>x.error); if(err?.error) throw new Error(err.error.message)
 const [profile,projects,memberships,chats,messages,files,memories,memoryItems,summaries,mcp,github,cowork,grants,artifacts,ragChunks,consents,policyAcceptances,dataRequests,securityReports,securityAlerts,subprocessorJobs,audit,skills,userSkills,credentials]=results
 const fileIds=(files.data??[]).map((x:any)=>x.id); let chunks:any[]=[]
 if(fileIds.length){const r=await supabase.from('file_chunks').select('id,file_id,chunk_index,content,metadata,created_at').in('file_id',fileIds);if(r.error)throw new Error(r.error.message);chunks=r.data??[]}
 const {data:auth}=await supabase.auth.getUser()
 return {exported_at:new Date().toISOString(),account:{id:userId,email:auth.user?.email??null},profile:profile.data,projects:projects.data??[],project_memberships:memberships.data??[],chats:chats.data??[],messages:messages.data??[],files:files.data??[],file_chunks:chunks,memories:memories.data??[],memory_items:memoryItems.data??[],conversation_summaries:summaries.data??[],mcp_connections:mcp.data??[],github_connections:github.data??[],cowork_sessions:cowork.data??[],permission_grants:grants.data??[],artifacts:artifacts.data??[],rag_chunks:ragChunks.data??[],privacy_consents:consents.data??[],policy_acceptances:policyAcceptances.data??[],data_subject_requests:dataRequests.data??[],security_reports:securityReports.data??[],security_alerts:securityAlerts.data??[],subprocessor_deletion_jobs:subprocessorJobs.data??[],audit_logs:audit.data??[],skills:skills.data??[],user_skills:userSkills.data??[],api_credentials:credentials.data??[]}
}
export async function GET(request:Request){
 try{const {user}=await requireUser();const rl=rateLimit(clientKey(request,user.id),3,60000);if(!rl.allowed)return NextResponse.json({error:'Muitas exportações. Tente novamente em instantes.'},{status:429});const data=await exportAccount(user.id);const admin=createSupabaseAdminClient();await admin.from('security_events').insert({user_id:user.id,event_type:'data_export',severity:'info',metadata:{source:'account'}});return new NextResponse(JSON.stringify(data,null,2),{headers:{'content-type':'application/json; charset=utf-8','content-disposition':'attachment; filename="open-claude-data.json"','cache-control':'no-store'}})}
 catch(e){const m=e instanceof Error?e.message:'Não foi possível exportar seus dados.';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:500})}
}
export async function DELETE(request:Request){
 try{const {user}=await requireUser();const rl=rateLimit(clientKey(request,user.id),2,60000);if(!rl.allowed)return NextResponse.json({error:'Muitas tentativas. Tente novamente em instantes.'},{status:429});const body=await request.json().catch(()=>({}));if(body?.confirm!==user.email)return NextResponse.json({error:'Confirmação inválida. Digite seu e-mail exatamente.'},{status:400});const admin=createSupabaseAdminClient();await admin.from('security_events').insert({user_id:user.id,event_type:'account_deletion',severity:'warning',metadata:{source:'account'}});const {data:fileRows}=await admin.from('files').select('storage_bucket,storage_path').eq('owner_id',user.id);const paths=(fileRows??[]).map((x:any)=>x.storage_path).filter(Boolean);if(paths.length)await admin.storage.from('open-claude-files').remove(paths);const {data:objects}=await admin.storage.from('open-claude-files').list(user.id,{limit:1000});if(objects?.length)await admin.storage.from('open-claude-files').remove(objects.map(x=>user.id+'/'+x.name));const {error}=await admin.auth.admin.deleteUser(user.id);if(error)throw new Error(error.message);return NextResponse.json({ok:true})}
 catch(e){const m=e instanceof Error?e.message:'Não foi possível excluir sua conta.';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:500})}
}
