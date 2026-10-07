import {NextResponse} from 'next/server'
import {createSupabaseAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET
 const auth=request.headers.get('authorization')
 if(!secret||auth!=='Bearer '+secret)return NextResponse.json({error:'Unauthorized'},{status:401})
 const admin=createSupabaseAdminClient();const cutoff=new Date(Date.now()-180*24*60*60*1000).toISOString()
 const a=await admin.from('audit_logs').delete().lt('created_at',cutoff)
 const s=await admin.from('security_events').delete().lt('created_at',cutoff)
 if(a.error||s.error)return NextResponse.json({error:a.error?.message||s.error?.message},{status:500})
 return NextResponse.json({ok:true,cutoff})
}
