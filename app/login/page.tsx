'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSent(false)
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(error.code === 'email_not_confirmed'
        ? 'Confirme seu e-mail antes de entrar. Se precisar, reenvie o e-mail de confirmação abaixo.'
        : 'E-mail ou senha inválidos.')
    } else {
      router.push('/chat')
    }
    setLoading(false)
  }

  async function resendConfirmation() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setError('Digite seu e-mail para reenviar a confirmação.')
      return
    }
    setError('')
    setSent(false)
    setResending(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) setError('Não foi possível reenviar agora. Verifique o e-mail e tente novamente em instantes.')
    else setSent(true)
    setResending(false)
  }

  return <main className="shell"><div className="chat card">
    <Link href="/" className="muted">← Open Claude</Link>
    <h1>Entrar</h1>
    <p className="muted">Sua sessão é validada no servidor.</p>
    <form onSubmit={submit}>
      <label>E-mail<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Senha<input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      {sent && <p role="status">E-mail de confirmação reenviado. Verifique sua caixa de entrada.</p>}
      <button className="button" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
    </form>
    <button type="button" className="muted" onClick={resendConfirmation} disabled={resending}>
      {resending ? 'Reenviando…' : 'Reenviar confirmação de e-mail'}
    </button>
    <p className="muted">Ainda não tem conta? <Link href="/signup">Criar conta</Link></p>
  </div></main>
}
