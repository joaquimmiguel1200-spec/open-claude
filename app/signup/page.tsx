'use client'
import {FormEvent,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'

export default function SignupPage(){
 const router=useRouter()
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [accepted,setAccepted]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [loading,setLoading]=useState(false)

 async function acceptPolicies(){
  const results=await Promise.all(['terms','privacy','security','cookies','acceptable_use','ai'].map(policyType=>fetch('/api/policy-acceptance',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({policyType})})))
  if(results.some(response=>!response.ok))throw new Error('Não foi possível registrar todos os aceites. Entre novamente para concluir.')
  localStorage.removeItem('open-claude-policies-pending')
 }

 async function submit(e:FormEvent){
  e.preventDefault()
  setError('')
  setMessage('')
  if(!accepted){setError('Você precisa aceitar os Termos, Privacidade, Segurança e regras de uso.');return}
  setLoading(true)
  try{
   const response=await fetch('/api/auth/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.trim(),password,accepted,honeypot:''})})
   const result=await response.json().catch(()=>({}))
   if(!response.ok){setError(result.error||'Não foi possível criar a conta.');return}
   if(result.authenticated){
    try{await acceptPolicies();router.push('/chat')}
    catch(e){localStorage.setItem('open-claude-policies-pending','1');setError(e instanceof Error?e.message:'Não foi possível registrar os aceites.')}
   }else{
    localStorage.setItem('open-claude-policies-pending','1')
    setMessage('A confirmação por e-mail ainda está ativada no Supabase. Desative “Confirm email” nas configurações de Auth do projeto para testar o cadastro sem verificação.')
   }
  }catch{setError('Não foi possível criar a conta agora.')}
  finally{setLoading(false)}
 }

 return <main className="shell"><div className="chat card">
  <Link href="/" className="auth-brand" aria-label="Voltar à página inicial"><img src="/open-claude-logo.svg" alt="Open Claude" width="190" height="54" /></Link>
  <h1>Criar conta</h1>
  <form onSubmit={submit}>
   <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
   <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><span className="muted">Use pelo menos 8 caracteres.</span></label>
   <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>Li e aceito os <Link href="/terms">Termos</Link>, a <Link href="/privacy">Política de Privacidade</Link>, a <Link href="/security">Política de Segurança</Link> e as regras de uso.</span></label>
   {error&&<p role="alert">{error}</p>}
   {message&&<p role="status">{message}</p>}
   <button className="button" disabled={loading}>{loading?'Criando…':'Criar conta'}</button>
  </form>
  <p className="muted">Já tem conta? <Link href="/login">Entrar</Link></p>
 </div></main>
}
