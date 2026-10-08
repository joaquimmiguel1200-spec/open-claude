import {NextResponse} from 'next/server'
import {createSupabaseAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
export async function POST(request:Request){
 try{const body=await request.json().catch(()=>({}));const admin=createSupabaseAdminClient();await admin.from('security_events').insert({event_type:'csp_report',severity:'warning',metadata:{report:body,ip:(request.headers.get('x-forwarded-for')??'').split(',')[0].trim().slice(0,100)}});return new NextResponse(null,{status:204})}catch{return new NextResponse(null,{status:204})}
}