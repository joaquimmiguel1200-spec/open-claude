import {NextResponse} from 'next/server'
import {SUPABASE_URL} from '@/lib/supabase/config'
export const runtime='nodejs'
export async function GET(){
 const started=Date.now()
 try{const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; if(!key)throw new Error('Supabase publishable key is not configured.'); const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),5000); try { const response=await fetch(SUPABASE_URL+'/auth/v1/health',{headers:{apikey:key,Authorization:'Bearer '+key},signal:controller.signal,cache:'no-store'}); if(!response.ok)throw new Error('Supabase REST health returned HTTP '+response.status); } finally { clearTimeout(timeout); }return NextResponse.json({ok:true,service:'open-claude',database:'ok',latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{headers:{'cache-control':'no-store'}})}
 catch(e){return NextResponse.json({ok:false,service:'open-claude',database:'error',error:e instanceof Error?'Database health check failed.':'unavailable',latencyMs:Date.now()-started},{status:503,headers:{'cache-control':'no-store'}})}
}
