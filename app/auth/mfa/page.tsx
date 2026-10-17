'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
export default function MfaPage(){
 const router=useRouter();const [factorId,setFactorId]=useState('');const [code,setCode]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(true)
 useEffect(()=>{(async()=>{try{const response=await fetch('/api/auth/mfa',{cache:'no-store'});if(response.status===401){router.replace('/login');return}const data=await response.json();const f=data.verifiedFactor;if(!response.ok||!f){router.replace('/chat');return}setFactorId(f.id);setLoading(false)}catch{setError('Não foi possível carregar a verificação.');setLoading(false)}})()},[router])
 async function verify(){setError('');setLoading(true);try{const response=await fetch('/api/auth/mfa',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'challengeAndVerify',factorId,code:code.trim()})});const data=await response.json().catch(()=>({}));if(!response.ok){setError(data.error||'Código inválido.');return}router.replace('/chat')}catch{setError('Não foi possível verificar o código.')}finally{setLoading(false)}}
 if(loading)return <main className="shell"><p className="muted">Carregando autenticação…</p></main>
 return <main className="shell"><div className="chat card"><h1>Verificação em duas etapas</h1><p className="muted">Digite o código de 6 dígitos do seu aplicativo autenticador.</p><input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>{error&&<p role="alert">{error}</p>}<button className="button" disabled={code.length!==6} onClick={verify}>Verificar</button></div></main>
}