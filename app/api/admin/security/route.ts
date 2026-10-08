import {NextResponse} from 'next/server'
import {requireUser} from '@/lib/supabase/server'
import {createSupabaseAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
function isAdmin(id:string){return (process.env.ADMIN_USER_IDS??'').split(',').map(x=>x.trim()).filter(Boolean).includes(id)}
export async function GET(){
 try{const {user}=await requireUser();if(!isAdmin(user.id))return NextResponse.json({error:'Forbidden'},{status:403});const admin=createSupabaseAdminClient();const [reports,suspensions,alerts]=await Promise.all([admin.from('security_reports').select('*').order('created_at',{ascending:false}).limit(200),admin.from('account_suspensions').select('*').order('created_at',{ascending:false}).limit(200),admin.from('security_events').select('*').order('created_at',{ascending:false}).limit(200)]);return NextResponse.json({reports:reports.data??[],suspensions:suspensions.data??[],events:alerts.data??[]})}
 catch(e){const m=e instanceof Error?e.message:'Forbidden';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:500})}
}
export async function POST(request:Request){
 try{const {user}=await requireUser();if(!isAdmin(user.id))return NextResponse.json({error:'Forbidden'},{status:403});const b=await request.json();const admin=createSupabaseAdminClient();const action=String(b?.action??'');if(action==='review'){const id=String(b.id);const status=String(b.status);if(!['reviewing','resolved','dismissed'].includes(status))return NextResponse.json({error:'Invalid status'},{status:400});const r=await admin.from('security_reports').update({status,review_notes:String(b.notes??'').slice(0,5000),resolved_at:status==='resolved'||status==='dismissed'?new Date().toISOString():null}).eq('id',id);if(r.error)throw new Error(r.error.message);return NextResponse.json({ok:true})}
 if(action==='suspend'){const target=String(b.userId);const minutes=Math.max(5,Math.min(Number(b.minutes??30),60*24*30));const r=await admin.from('account_suspensions').insert({user_id:target,reason:String(b.reason??'Administrative security action').slice(0,500),source:'admin',starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+minutes*60000).toISOString(),active:true,metadata:{admin:user.id}});if(r.error)throw new Error(r.error.message);await admin.from('security_events').insert({user_id:target,event_type:'account_suspended',severity:'critical',metadata:{admin:user.id,minutes}});return NextResponse.json({ok:true})}
 if(action==='unsuspend'){const target=String(b.userId);const r=await admin.from('account_suspensions').update({active:false,ends_at:new Date().toISOString()}).eq('user_id',target).eq('active',true);if(r.error)throw new Error(r.error.message);return NextResponse.json({ok:true})}
 return NextResponse.json({error:'Invalid action'},{status:400})}
 catch(e){const m=e instanceof Error?e.message:'Admin security action failed';return NextResponse.json({error:m},{status:m==='UNAUTHENTICATED'?401:500})}
}