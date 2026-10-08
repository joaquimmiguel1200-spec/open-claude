import {NextResponse} from 'next/server'
import {createSupabaseAdminClient} from '@/lib/supabase/admin'
export const runtime='nodejs'
export async function GET(){
 const started=Date.now()
 try{const admin=createSupabaseAdminClient();const {error}=await admin.from('profiles').select('id').limit(1);if(error)throw new Error(error.message);return NextResponse.json({ok:true,service:'open-claude',database:'ok',latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{headers:{'cache-control':'no-store'}})}
 catch(e){return NextResponse.json({ok:false,service:'open-claude',database:'error',error:e instanceof Error?'Database health check failed.':'unavailable',latencyMs:Date.now()-started},{status:503,headers:{'cache-control':'no-store'}})}
}
