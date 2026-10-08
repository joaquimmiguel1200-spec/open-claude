import {NextResponse} from 'next/server'
import {createSupabaseServerClient} from '@/lib/supabase/server'
export const runtime='nodejs'
export async function GET(){
 const started=Date.now()
 try{const s=await createSupabaseServerClient();const {error}=await s.from('profiles').select('id').limit(1);if(error)throw new Error(error.message);return NextResponse.json({ok:true,service:'open-claude',database:'ok',latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{headers:{'cache-control':'no-store'}})}
 catch(e){return NextResponse.json({ok:false,service:'open-claude',database:'error',error:e instanceof Error?e.message:'unavailable',latencyMs:Date.now()-started},{status:503,headers:{'cache-control':'no-store'}})}
}