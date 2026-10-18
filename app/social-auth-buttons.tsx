'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Provider = 'google' | 'azure' | 'github'
type Props = { requireConsent?: boolean; consentAccepted?: boolean }

const providers: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Continuar com Google' },
  { id: 'azure', label: 'Continuar com Microsoft' },
  { id: 'github', label: 'Continuar com GitHub' },
]

export default function SocialAuthButtons({ requireConsent = false, consentAccepted = false }: Props) {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState('')

  async function start(provider: Provider) {
    if (requireConsent && !consentAccepted) {
      setError('Aceite os termos e políticas antes de criar uma conta.')
      return
    }
    setLoading(provider)
    setError('')
    try {
      if (requireConsent) localStorage.setItem('open-claude-policies-pending', '1')
      const supabase = createSupabaseBrowserClient()
      const redirectTo = new URL('/auth/callback?next=/auth/complete', window.location.origin).toString()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === 'azure' ? { scopes: 'email' } : {}),
        },
      })
      if (oauthError) {
        if (requireConsent) localStorage.removeItem('open-claude-policies-pending')
        setError('Não foi possível iniciar o login. Verifique se este provedor está habilitado e configurado no Supabase.')
        setLoading(null)
      }
    } catch {
      if (requireConsent) localStorage.removeItem('open-claude-policies-pending')
      setError('Não foi possível iniciar o login agora. Tente novamente.')
      setLoading(null)
    }
  }

  return (
    <section aria-label="Outras formas de entrar" style={{ display: 'grid', gap: 8, marginTop: 16 }}>
      <div className="muted" style={{ textAlign: 'center', fontSize: 13 }}>ou continue com</div>
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          className="button secondary"
          onClick={() => start(provider.id)}
          disabled={loading !== null || (requireConsent && !consentAccepted)}
          aria-busy={loading === provider.id}
        >
          {loading === provider.id ? 'Redirecionando…' : provider.label}
        </button>
      ))}
      {requireConsent && !consentAccepted && <p className="muted" style={{ fontSize: 12 }}>Para criar uma conta, aceite os termos e políticas acima.</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
