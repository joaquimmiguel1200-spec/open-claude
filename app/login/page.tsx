'use client'
import {FormEvent,useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {createSupabaseBrowserClient} from '@/lib/supabase/browser'

type OAuthProvider='google'|'azure'|'github'
export default function LoginPage(){
 const router=useRouter()
 const [email,setEmail]=useState('')
 const [password,setPassword]=useState('')
 const [error,setError]=useState('')
 const [info,setInfo]=useState('')
 const [loading,setLoading]=useState(false)
 const [oauthLoading,setOauthLoading]=useState<OAuthProvider|null>(null)

 useEffect(()=>{const p=new URLSearchParams(window.location.search);if(p.get('approval')==='pending')setInfo('Seu cadastro está aguardando aprovação administrativa. Você poderá entrar assim que o administrador liberar o acesso.');if(p.get('error')==='confirmation')setError('Não foi possível concluir a autenticação.');if(p.get('error')==='oauth')setError('Não foi possível concluir o login social.')},[])

 async function oauth(provider:OAuthProvider){
  setError('');setOauthLoading(provider)
  try{
   const supabase=createSupabaseBrowserClient()
   const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/auth/callback',...(provider==='azure'?{scopes:'email openid profile'}:{})}})
   if(error)throw error
  }catch{setError('Login social indisponível. Verifique as credenciais e a ativação do provedor no Supabase.');setOauthLoading(null)}
 }
 async function submit(e:FormEvent){
  e.preventDefault();setError('');setInfo('');setLoading(true)
  try{
   const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email.trim(),password,honeypot:''})})
   const x=await r.json()
   if(!r.ok){if(x.approvalRequired)setInfo(x.error||'Cadastro aguardando aprovação.');else setError(x.error||'E-mail ou senha inválidos.');return}
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
  <Link href="/" className="auth-brand" aria-label="Voltar à página inicial"><img src="/open-claude-logo.svg" alt="Open Claude" width="190" height="54"/></Link>
  <h1>Entrar</h1>
  <p className="muted">Acesso disponível somente para contas aprovadas pelo administrador.</p>
  <div style={{display:'grid',gap:8,margin:'18px 0'}}>
   <button type="button" className="button secondary" disabled={!!oauthLoading} onClick={()=>oauth('google')}>{oauthLoading==='google'?'Conectando…':'Continuar com Google'}</button>
   <button type="button" className="button secondary" disabled={!!oauthLoading} onClick={()=>oauth('azure')}>{oauthLoading==='azure'?'Conectando…':'Continuar com Microsoft'}</button>
   <button type="button" className="button secondary" disabled={!!oauthLoading} onClick={()=>oauth('github')}>{oauthLoading==='github'?'Conectando…':'Continuar com GitHub'}</button>
  </div>
  <p className="muted">Ou entre com e-mail e senha:</p>
  <form onSubmit={submit}>
   <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254}/></label>
   <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {info&&<p role="status">{info}</p>}{error&&<p role="alert">{error}</p>}
   <button className="button" disabled={loading||!!oauthLoading}>{loading?'Entrando…':'Entrar'}</button>
  </form>
  <p className="muted">Ainda não tem conta? <Link href="/signup">Criar conta</Link></p>
 </div></main>
}
