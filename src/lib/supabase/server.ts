import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'
export async function createSupabaseServerClient(){
 const cookieStore=await cookies()
 return createServerClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll(){return cookieStore.getAll()},setAll(cookiesToSet){try{cookiesToSet.forEach(({name,value,options})=>cookieStore.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}))}catch{}}}})
}
export async function requireUser(){
 const supabase=await createSupabaseServerClient()
 const {data,error}=await supabase.auth.getUser()
 if(error||!data.user)throw new Error('UNAUTHENTICATED')
 const suspension=await supabase.from('account_suspensions').select('id,reason,ends_at').eq('user_id',data.user.id).eq('active',true).or('ends_at.is.null,ends_at.gt.'+new Date().toISOString()).limit(1).maybeSingle()
 if(suspension.error)throw new Error(suspension.error.message)
 if(suspension.data)throw new Error('ACCOUNT_SUSPENDED')
 const {data:aal}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
 const {data:factors}=await supabase.auth.mfa.listFactors()
 const verified=(factors?.all??[]).filter((f:any)=>f.status==='verified')
 if(verified.length && aal?.currentLevel!=='aal2')throw new Error('MFA_REQUIRED')
 return {supabase,user:data.user}
}
