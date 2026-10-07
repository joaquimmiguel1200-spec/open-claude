'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser'
export default function MfaPage(){
 const router=useRouter();const [factorId,setFactorId]=useState('');const [code,setCode]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{const s=createSupabaseBrowserClient();const {data}=await s.auth.mfa.listFactors();const f=(data?.all??[]).find((x:any)=>x.status==='verified');if(!f){router.replace('/chat');return}setFactorId(f.id);setLoading(false)})()},[router])
 async function verify(){setError('');const s=createSupabaseBrowserClient();const {data,error}=await s.auth.mfa.challengeAndVerify({factorId,code:code.trim()});if(error||!data){setError(error?.message||'Código inválido.');return}router.replace('/chat')}
 if(loading)return <main className="shell"><p className="muted">Carregando autenticação…</p></main>
 return <main className="shell"><div className="chat card"><h1>Verificação em duas etapas</h1><p className="muted">Digite o código de 6 dígitos do seu aplicativo autenticador.</p><input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>{error&&<p role="alert">{error}</p>}<button className="button" disabled={code.length!==6} onClick={verify}>Verificar</button></div></main>
}