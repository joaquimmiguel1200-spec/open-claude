import {NextResponse} from 'next/server'
import {createSupabaseAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'Unauthorized'},{status:401})
 const admin=createSupabaseAdminClient();const checks:any[]=[]
 for(const table of ['profiles','projects','chats','messages','files','security_events','policy_acceptances']){const r=await admin.from(table).select('*',{count:'exact',head:true});checks.push({table,ok:!r.error,count:r.count??0,error:r.error?.message??null})}
 const failed=checks.filter(x=>!x.ok)
 await admin.from('security_events').insert({event_type:'operational_check',severity:failed.length?'critical':'info',metadata:{checks,backup_status:'provider-managed; restore test requires provider restore environment'}})
 return NextResponse.json({ok:failed.length===0,checks,backup:{status:'provider-managed',restoreTest:'not automated'}})
}