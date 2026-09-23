'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage(){
  const router=useRouter(); const supabase=createSupabaseBrowserClient(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  async function submit(e:FormEvent){e.preventDefault();setError('');setLoading(true);const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setError('E-mail ou senha inválidos.');else router.push('/chat');setLoading(false)}
  return <main className="shell"><div className="chat card"><Link href="/" className="muted">← Open Claude</Link><h1>Entrar</h1><p className="muted">Sua sessão é validada no servidor.</p><form onSubmit={submit}><label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Senha<input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>{error&&<p role="alert">{error}</p>}<button className="button" disabled={loading}>{loading?'Entrando…':'Entrar'}</button></form></div></main>
}
