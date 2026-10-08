import {NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import {SUPABASE_URL} from '@/lib/supabase/config'
export const runtime='nodejs'
export async function GET(){
 const started=Date.now()
 try{const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; if(!key)throw new Error('Supabase publishable key is not configured.'); const client=createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}); const {error}=await client.from('profiles').select('id').limit(1); if(error)throw new Error(error.message);return NextResponse.json({ok:true,service:'open-claude',database:'ok',latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{headers:{'cache-control':'no-store'}})}
 catch(e){return NextResponse.json({ok:false,service:'open-claude',database:'error',error:e instanceof Error?'Database health check failed.':'unavailable',latencyMs:Date.now()-started},{status:503,headers:{'cache-control':'no-store'}})}
}
