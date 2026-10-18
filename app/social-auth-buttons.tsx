'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Provider = 'google' | 'azure' | 'github'

const providers: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Continuar com Google' },
  { id: 'azure', label: 'Continuar com Microsoft' },
  { id: 'github', label: 'Continuar com GitHub' },
]

export default function SocialAuthButtons() {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState('')

  async function start(provider: Provider) {
    setLoading(provider)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const redirectTo = new URL('/auth/callback?next=/chat', window.location.origin).toString()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === 'azure' ? { scopes: 'email' } : {}),
        },
      })
      if (oauthError) {
        setError('Não foi possível iniciar o login. Verifique se este provedor está habilitado e configurado no Supabase.')
        setLoading(null)
      }
    } catch {
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
          disabled={loading !== null}
          aria-busy={loading === provider.id}
        >
          {loading === provider.id ? 'Redirecionando…' : provider.label}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
