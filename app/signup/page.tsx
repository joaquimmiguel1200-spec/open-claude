'use client'
import {FormEvent,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser'

export default function SignupPage(){
 const router=useRouter()
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [accepted,setAccepted]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [loading,setLoading]=useState(false)
 const [oauthLoading,setOauthLoading]=useState('')

 async function oauth(provider:'google'|'azure'|'github'){setError('');setOauthLoading(provider);try{const supabase=createSupabaseBrowserClient();const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/auth/callback',...(provider==='azure'?{scopes:'email openid profile'}:{})}});if(error)throw error}catch{setError('Cadastro social indisponível. Verifique as credenciais e a ativação do provedor no Supabase.');setOauthLoading('')}}

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
    setMessage('Cadastro recebido. Seu acesso ficará aguardando aprovação do administrador. Para que a aprovação interna seja o único fluxo de liberação, o administrador também precisa desativar a confirmação por e-mail nas configurações de Auth do Supabase.')
   }
  }catch{setError('Não foi possível criar a conta agora.')}
  finally{setLoading(false)}
 }

 return <main className="shell"><div className="chat card">
  <Link href="/" className="auth-brand" aria-label="Voltar à página inicial"><img src="/open-claude-logo.svg" alt="Open Claude" width="190" height="54" /></Link>
  <h1>Criar conta</h1>
  <div style={{display:'grid',gap:8,margin:'18px 0'}}><button type="button" className="button secondary" disabled={!!oauthLoading} onClick={()=>oauth('google')}>Cadastrar com Google</button><button type="button" className="button secondary" disabled={!!oauthLoading} onClick={()=>oauth('azure')}>Cadastrar com Microsoft</button><button type="button" className="button secondary" disabled={!!oauthLoading} onClick={()=>oauth('github')}>Cadastrar com GitHub</button></div>
  <p className="muted">Ou cadastre-se com e-mail e senha:</p>
  <form onSubmit={submit}>
   <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
   <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><span className="muted">Use pelo menos 8 caracteres.</span></label>
   <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} required/><span>Li e aceito os <Link href="/terms">Termos</Link>, a <Link href="/privacy">Política de Privacidade</Link>, a <Link href="/security">Política de Segurança</Link> e as regras de uso.</span></label>
   {oauthLoading&&<p className="muted">Conectando com {oauthLoading}…</p>}{error&&<p role="alert">{error}</p>}
   {message&&<p role="status">{message}</p>}
   <button className="button" disabled={loading}>{loading?'Criando…':'Criar conta'}</button>
  </form>
  <p className="muted">Já tem conta? <Link href="/login">Entrar</Link></p>
 </div></main>
}
