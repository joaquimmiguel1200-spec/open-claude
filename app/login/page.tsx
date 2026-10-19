'use client'
import {FormEvent,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'

export default function LoginPage(){
 const router=useRouter()
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)

 async function submit(e:FormEvent){
  e.preventDefault();setError('');setLoading(true)
  try{
   const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.trim(),password,honeypot:''})})
   const x=await r.json()
   if(!r.ok){setError(x.error||'E-mail ou senha inválidos.');return}
   if(x.needsMfa){router.push('/auth/mfa');return}
   if(localStorage.getItem('open-claude-policies-pending')==='1'){
    const results=await Promise.all(['terms','privacy','security','cookies','acceptable_use','ai'].map(policyType=>fetch('/api/policy-acceptance',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({policyType})})))
    if(results.some(response=>!response.ok)){setError('Não foi possível registrar os aceites das políticas. Tente novamente.');return}
    localStorage.removeItem('open-claude-policies-pending')
   }
   router.push('/chat')
  }catch{setError('Não foi possível entrar agora.')}
  finally{setLoading(false)}
 }

 return <main className="shell"><div className="chat card">
  <Link href="/" className="muted">← Open Claude</Link>
  <h1>Entrar</h1>
  <p className="muted">Entre com seu e-mail e senha. Confirmação por e-mail será configurada posteriormente.</p>
  <form onSubmit={submit}>
   <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
   <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<p role="alert">{error}</p>}
   <button className="button" disabled={loading}>{loading?'Entrando…':'Entrar'}</button>
  </form>
  <p className="muted">Ainda não tem conta? <Link href="/signup">Criar conta</Link></p>
 </div></main>
}
