'use client'
import { FormEvent,useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function SignupPage(){
  const router=useRouter()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [loading,setLoading]=useState(false)

  async function submit(e:FormEvent){
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    if(password.length<8){setError('A senha precisa ter pelo menos 8 caracteres.');setLoading(false);return}
    const supabase=createSupabaseBrowserClient()
    const {data,error}=await supabase.auth.signUp({
      email:email.trim(),
      password,
      options:{emailRedirectTo:window.location.origin+'/auth/callback'}
    })
    if(error) setError(error.message.toLowerCase().includes('already') ? 'Este e-mail já possui uma conta. Entre ou reenvie a confirmação.' : 'Não foi possível criar a conta.')
    else if(data.session) router.push('/chat')
    else setMessage('Conta criada. Confirme seu e-mail para ativar o acesso e depois entre novamente.')
    setLoading(false)
  }

  return <main className="shell"><div className="chat card">
    <Link href="/" className="muted">← Open Claude</Link>
    <h1>Criar conta</h1>
    <form onSubmit={submit}>
      <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Senha<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error&&<p role="alert">{error}</p>}
      {message&&<p role="status">{message}</p>}
      <button className="button" disabled={loading}>{loading?'Criando…':'Criar conta'}</button>
    </form>
    <p className="muted">Já tem conta? <Link href="/login">Entrar</Link></p>
  </div></main>
}
