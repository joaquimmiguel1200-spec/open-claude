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
 const [resending,setResending]=useState(false)
 const [resendMessage,setResendMessage]=useState('')

 async function acceptPolicies(){
  const results=await Promise.all(['terms','privacy','security','cookies','acceptable_use','ai'].map(policyType=>fetch('/api/policy-acceptance',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({policyType})})))
  if(results.some(response=>!response.ok))throw new Error('Não foi possível registrar todos os aceites. Entre novamente para concluir.')
  localStorage.removeItem('open-claude-policies-pending')
 }

 async function resendConfirmation(){
  const normalizedEmail=email.trim()
  if(!normalizedEmail){setError('Digite seu e-mail para solicitar a confirmação.');return}
  setError('')
  setResendMessage('')
  setResending(true)
  try{
   const response=await fetch('/api/auth/resend-confirmation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:normalizedEmail})})
   const result=await response.json().catch(()=>({}))
   if(!response.ok)throw new Error(result.error||'Não foi possível solicitar o envio agora.')
   setResendMessage('Solicitação processada. Se houver uma conta pendente para esse endereço, confira sua caixa de entrada e spam.')
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível solicitar o envio agora.')}
  finally{setResending(false)}
 }

 async function submit(e:FormEvent){
  e.preventDefault()
  setError('')
  setMessage('')
  setResendMessage('')
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
    setMessage('Cadastro recebido. Confirme o endereço de e-mail para ativar sua conta. Se a mensagem não chegar, verifique spam e solicite um novo envio abaixo.')
   }
  }catch{setError('Não foi possível criar a conta agora.')}
  finally{setLoading(false)}
 }

 return <main className="shell"><div className="chat card">
  <Link href="/" className="muted">← Open Claude</Link>
  <h1>Criar conta</h1>
  <form onSubmit={submit}>
   <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
   <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><span className="muted">Use pelo menos 8 caracteres.</span></label>
   <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>Li e aceito os <Link href="/terms">Termos</Link>, a <Link href="/privacy">Política de Privacidade</Link>, a <Link href="/security">Política de Segurança</Link> e as regras de uso.</span></label>
   {error&&<p role="alert">{error}</p>}
   {message&&<p role="status">{message}</p>}
   {resendMessage&&<p role="status">{resendMessage}</p>}
   <button className="button" disabled={loading||resending}>{loading?'Criando…':'Criar conta'}</button>
  </form>
  {message&&<button type="button" className="button secondary" onClick={resendConfirmation} disabled={resending||loading}>{resending?'Solicitando…':'Reenviar confirmação de e-mail'}</button>}
  <p className="muted">Já tem conta? <Link href="/login">Entrar</Link></p>
 </div></main>
}
