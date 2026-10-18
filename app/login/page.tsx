'use client'
import {FormEvent,useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser'

export default function LoginPage(){
 const router=useRouter()
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const [resending,setResending]=useState(false)
 const [sent,setSent]=useState(false)

 useEffect(()=>{
  const params=new URLSearchParams(window.location.search)
  if(params.get('error')==='confirmation')setError('O link de confirmação é inválido ou expirou. Solicite um novo envio e use o link mais recente.')
 },[])

 async function submit(e:FormEvent){
  e.preventDefault();setError('');setSent(false);setLoading(true)
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

 async function oauth(provider:'google'|'azure'|'github'){
  setError('');setLoading(true)
  try{
   localStorage.setItem('open-claude-policies-pending','1')
   const supabase=createSupabaseBrowserClient()
   const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/auth/callback?next=%2Fchat',scopes:provider==='azure'?'openid profile email':'email'}})
   if(error){localStorage.removeItem('open-claude-policies-pending');setError('Não foi possível iniciar o login externo. Verifique se o provedor está habilitado nas configurações do Supabase.')}
  }catch{localStorage.removeItem('open-claude-policies-pending');setError('Não foi possível iniciar o login externo.')}
  finally{setLoading(false)}
 }

 async function resendConfirmation(){
  const normalizedEmail=email.trim()
  if(!normalizedEmail){setError('Digite seu e-mail para solicitar a confirmação.');return}
  setError('');setSent(false);setResending(true)
  try{
   const response=await fetch('/api/auth/resend-confirmation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:normalizedEmail})})
   const result=await response.json().catch(()=>({}))
   if(!response.ok){setError(result.error||'Não foi possível solicitar o envio agora.');return}
   setSent(true)
  }catch{setError('Não foi possível solicitar o envio agora.')}
  finally{setResending(false)}
 }

 return <main className="shell"><div className="chat card">
  <Link href="/" className="muted">← Open Claude</Link>
  <h1>Entrar</h1>
  <p className="muted">Proteção contra força bruta e credential stuffing ativa.</p>
  <div className="oauth-actions" aria-label="Outras formas de entrar">
   <button type="button" className="button secondary" onClick={()=>oauth('google')} disabled={loading}>Continuar com Google</button>
   <button type="button" className="button secondary" onClick={()=>oauth('azure')} disabled={loading}>Continuar com Microsoft</button>
   <button type="button" className="button secondary" onClick={()=>oauth('github')} disabled={loading}>Continuar com GitHub</button>
  </div>
  <div className="oauth-divider"><span>ou entre com e-mail</span></div>
  <form onSubmit={submit}>
   <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
   <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<p role="alert">{error}</p>}
   {sent&&<p role="status">Solicitação processada. Se houver uma conta pendente para esse endereço, confira sua caixa de entrada e spam.</p>}
   <button className="button" disabled={loading||resending}>{loading?'Entrando…':'Entrar'}</button>
  </form>
  <button type="button" className="muted" onClick={resendConfirmation} disabled={resending||loading}>{resending?'Solicitando…':'Reenviar confirmação de e-mail'}</button>
  <p className="muted">Ainda não tem conta? <Link href="/signup">Criar conta</Link></p>
 </div></main>
}
